"""
Module FutureKawa (FastAPI) — pilotage du capteur physique à distance.

- Configuration distante du capteur (topic / capteur / fréquence + libellés)
  publiée en RETAIN sur futurekawa/config/<deviceId>.
- Commande Démarrer / Arrêter publiée (non retenue) sur
  futurekawa/commande/<deviceId> : {"actif": true|false}.
- Simulation (mesures générées) conservée pour les tests sans capteur.
"""

import json
import os
import pathlib
import random
import threading
import time
from datetime import datetime, timezone

_BASE_DIR = pathlib.Path(__file__).parent

import httpx
import paho.mqtt.client as mqtt
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Configuration (surchargeable par variables d'environnement pour Docker)
# ---------------------------------------------------------------------------
CENTRAL_URL = os.getenv("CENTRAL_URL", "http://localhost:8090")
MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

SIM_EMAIL = os.getenv("SIM_EMAIL")
SIM_PASSWORD = os.getenv("SIM_PASSWORD")

IDEAUX = {
    "BRESIL":   (29.0, 55.0),
    "EQUATEUR": (31.0, 60.0),
    "COLOMBIE": (26.0, 80.0),
}

app = FastAPI(title="FutureKawa - Pilotage capteur & simulateur")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================================================================
#  Référentiel (proxy vers le central) pour alimenter les menus en cascade
# ===========================================================================
_token = {"value": None}


def _login_central() -> str:
    r = httpx.post(f"{CENTRAL_URL}/auth/login",
                   json={"email": SIM_EMAIL, "motDePasse": SIM_PASSWORD}, timeout=5.0)
    r.raise_for_status()
    return r.json()["accessToken"]


def _refresh_token_loop():
    """Renouvelle le token toutes les 12 min (JWT expire à 15 min)."""
    while True:
        time.sleep(12 * 60)
        if SIM_EMAIL and SIM_PASSWORD:
            try:
                _token["value"] = _login_central()
            except Exception:
                _token["value"] = None


threading.Thread(target=_refresh_token_loop, daemon=True).start()


def _get_central(path: str):
    if _token["value"] is None:
        _token["value"] = _login_central()

    def _call():
        return httpx.get(f"{CENTRAL_URL}{path}",
                         headers={"Authorization": f"Bearer {_token['value']}"}, timeout=5.0)

    try:
        resp = _call()
        if resp.status_code in (401, 403):
            _token["value"] = _login_central()
            resp = _call()
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Central injoignable ou refus : {e}")


@app.get("/api/pays")
def pays():
    return [p for p in _get_central("/api/pays") if p.get("disponible")]


@app.get("/api/pays/{code}/exploitations")
def exploitations(code: str):
    return _get_central(f"/api/pays/{code}/exploitations")


@app.get("/api/pays/{code}/exploitations/{exp_id}/entrepots")
def entrepots(code: str, exp_id: int):
    return _get_central(f"/api/pays/{code}/exploitations/{exp_id}/entrepots")


@app.get("/api/pays/{code}/entrepots/{entrepot_id}/capteurs")
def capteurs(code: str, entrepot_id: int):
    return _get_central(f"/api/pays/{code}/entrepots/{entrepot_id}/capteurs")


# ===========================================================================
#  PILOTAGE DU CAPTEUR PHYSIQUE : config (retain) + commande (marche/arret)
# ===========================================================================

class DemarrerCapteurRequest(BaseModel):
    deviceId: str
    pays: str
    entrepotId: int
    capteurId: str | None = None
    frequence: float = 30.0
    # libellés (pour l'affichage console du capteur)
    paysNom: str | None = None
    exploitationNom: str | None = None
    entrepotNom: str | None = None
    capteurNom: str | None = None


def _mqtt_client():
    c = mqtt.Client()
    c.connect(MQTT_HOST, MQTT_PORT, 30)
    c.loop_start()
    return c


@app.post("/api/capteur/demarrer")
def capteur_demarrer(req: DemarrerCapteurRequest):
    """Envoie le contexte (retain) PUIS l'ordre de démarrage."""
    topic_mesures = f"futurekawa/{req.pays.lower()}/{req.entrepotId}/mesures"
    config_topic = f"futurekawa/config/{req.deviceId}"
    commande_topic = f"futurekawa/commande/{req.deviceId}"

    config = {
        "topic": topic_mesures,
        "capteurId": req.capteurId or "",
        "frequence": max(2.0, req.frequence),
        "pays": req.paysNom or req.pays,
        "exploitation": req.exploitationNom or "",
        "entrepot": req.entrepotNom or str(req.entrepotId),
        "capteur": req.capteurNom or (req.capteurId or ""),
    }
    try:
        c = _mqtt_client()
        try:
            c.publish(config_topic, json.dumps(config), qos=1, retain=True).wait_for_publish(timeout=5)
            c.publish(commande_topic, json.dumps({"actif": True}), qos=1, retain=False).wait_for_publish(timeout=5)
            time.sleep(0.2)
        finally:
            c.loop_stop()
            c.disconnect()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Publication MQTT impossible : {e}")

    return {"statut": "demarre", "configTopic": config_topic,
            "commandeTopic": commande_topic, "config": config}


@app.post("/api/capteur/arreter/{device_id}")
def capteur_arreter(device_id: str):
    """Envoie l'ordre d'arrêt (le capteur cesse de publier immédiatement)."""
    commande_topic = f"futurekawa/commande/{device_id}"
    try:
        c = _mqtt_client()
        try:
            c.publish(commande_topic, json.dumps({"actif": False}), qos=1, retain=False).wait_for_publish(timeout=5)
            time.sleep(0.2)
        finally:
            c.loop_stop()
            c.disconnect()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Publication MQTT impossible : {e}")
    return {"statut": "arrete", "commandeTopic": commande_topic}


@app.post("/api/capteur/effacer-config/{device_id}")
def effacer_config(device_id: str):
    """Efface le contexte retenu (message vide retain)."""
    config_topic = f"futurekawa/config/{device_id}"
    try:
        c = _mqtt_client()
        try:
            c.publish(config_topic, "", qos=1, retain=True).wait_for_publish(timeout=5)
            time.sleep(0.2)
        finally:
            c.loop_stop()
            c.disconnect()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Effacement impossible : {e}")
    return {"statut": "effacee", "configTopic": config_topic}


# ===========================================================================
#  SIMULATION (mesures générées) — conservée pour les tests
# ===========================================================================
_simulations: dict[str, dict] = {}
_lock = threading.Lock()


def _payload(ideal_temp: float, ideal_hum: float, mode: str) -> dict:
    if mode == "anomalie":
        temp = round(ideal_temp + random.choice([-1, 1]) * random.uniform(6, 9), 2)
        hum = round(ideal_hum + random.choice([-1, 1]) * random.uniform(8, 15), 2)
    else:
        temp = round(ideal_temp + random.uniform(-1, 1), 2)
        hum = round(ideal_hum + random.uniform(-1, 1), 2)
    return {"temperature": temp, "humidite": max(0.0, min(100.0, hum))}


def _boucle_simulation(sim: dict):
    client = mqtt.Client()
    try:
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.loop_start()
    except Exception as e:
        sim["erreur"] = f"Connexion MQTT impossible : {e}"
        sim["actif"] = False
        return

    topic = f"futurekawa/{sim['pays'].lower()}/{sim['entrepotId']}/mesures"
    ideal_temp, ideal_hum = IDEAUX.get(sim["pays"], (29.0, 55.0))

    while not sim["stop"].is_set():
        valeurs = _payload(ideal_temp, ideal_hum, sim["mode"])
        message = {
            "capteurId": sim["capteurId"],
            "temperature": valeurs["temperature"],
            "humidite": valeurs["humidite"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        client.publish(topic, json.dumps(message), qos=1)
        hors_plage = (abs(valeurs["temperature"] - ideal_temp) > 3
                      or abs(valeurs["humidite"] - ideal_hum) > 2)
        sim["dernier"] = {**message, "horsPlage": hors_plage, "topic": topic}
        sim["compteur"] += 1
        sim["stop"].wait(sim["frequence"])

    client.loop_stop()
    client.disconnect()
    sim["actif"] = False


class DemarrerRequest(BaseModel):
    pays: str
    entrepotId: int
    capteurId: str
    mode: str = "normal"
    frequence: float = 5.0


@app.post("/api/simulation/demarrer")
def demarrer(req: DemarrerRequest):
    with _lock:
        existante = _simulations.get(req.capteurId)
        if existante and existante.get("actif"):
            raise HTTPException(status_code=409, detail="Une simulation tourne déjà pour ce capteur")
        sim = {
            "pays": req.pays, "entrepotId": req.entrepotId, "capteurId": req.capteurId,
            "mode": req.mode, "frequence": max(1.0, req.frequence),
            "stop": threading.Event(), "actif": True, "compteur": 0, "dernier": None, "erreur": None,
        }
        t = threading.Thread(target=_boucle_simulation, args=(sim,), daemon=True)
        sim["thread"] = t
        _simulations[req.capteurId] = sim
        t.start()
    return {"statut": "demarree", "capteurId": req.capteurId}


@app.post("/api/simulation/arreter/{capteur_id}")
def arreter(capteur_id: str):
    with _lock:
        sim = _simulations.get(capteur_id)
        if not sim:
            raise HTTPException(status_code=404, detail="Aucune simulation pour ce capteur")
        sim["stop"].set()
        sim["actif"] = False
    return {"statut": "arretee", "capteurId": capteur_id}


@app.get("/api/simulation/etat")
def etat():
    with _lock:
        return [
            {"capteurId": cid, "pays": s["pays"], "entrepotId": s["entrepotId"],
             "mode": s["mode"], "frequence": s["frequence"], "actif": s["actif"],
             "compteur": s["compteur"], "dernier": s["dernier"], "erreur": s["erreur"]}
            for cid, s in _simulations.items()
        ]


# ---------------------------------------------------------------------------
# Page web
# ---------------------------------------------------------------------------
@app.get("/")
def index():
    return FileResponse(_BASE_DIR / "static" / "index.html")


app.mount("/static", StaticFiles(directory=_BASE_DIR / "static"), name="static")