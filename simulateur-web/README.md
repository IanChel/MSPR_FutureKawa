# simulateur-web — Simulateur de capteurs (démo)

Outil de démonstration qui **génère des mesures** (température / humidité) et les **publie en MQTT** comme le ferait un capteur réel, afin de présenter le système sans matériel physique. Interface web avec sélection en cascade **pays → entrepôt → capteur**, mode normal/anomalie, fréquence réglable, et affichage live (valeurs + graphe).

> Le back-end métier ne sait pas que la donnée est simulée : le simulateur publie sur `futurekawa/{pays}/{entrepot}/mesures`, exactement comme un ESP32. Le jour où un capteur réel est branché, **rien ne change** côté back-end.

---

## Prérequis (à lancer AVANT)

- L'**infrastructure Docker** (Mosquitto + bases) : `docker compose up -d` dans `infra/`.
- Les **back-ends pays** (8080/8081/8082) et le **back-end central** (8090).

Le simulateur lit le référentiel (pays, entrepôts, capteurs) **via le central** (API sécurisée) et publie les mesures **directement sur Mosquitto**.

---

## Installation et lancement

```bash
cd simulateur-web
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/Mac : source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app:app --port 8050
```
Interface : **http://localhost:8050**

---

## Authentification (compte technique)

Le central étant sécurisé (JWT), le simulateur s'authentifie automatiquement au démarrage avec un **compte technique** dédié, en **lecture seule** :

- Email : `simulateur@futurekawa.example`
- Mot de passe : `Admin123!` (démonstration)
- Rôle : **LECTEUR** (peut lire le référentiel, ne peut rien modifier)

Le simulateur récupère un JWT, l'envoie dans tous ses appels au central, et se **reconnecte automatiquement** si le jeton expire. Aucune action manuelle requise.

> Configuration dans `app.py` : `CENTRAL_URL`, `SIM_EMAIL`, `SIM_PASSWORD`, `MQTT_HOST`, `MQTT_PORT`.

---

## Utilisation

1. Choisir un **pays**, une **exploitation**, un **entrepôt**, un **capteur** (menus en cascade).
2. Choisir le **mode** :
   - **Normal** : valeurs dans la plage idéale du pays.
   - **Anomalie** : valeurs hors plage → déclenche une alerte côté back-end.
3. Régler la **fréquence** d'envoi (ex. 5 s).
4. **Démarrer** : les mesures partent en MQTT ; les valeurs et le graphe s'actualisent en direct.
5. Le **voyant** passe au rouge quand les valeurs sortent de la plage (= une alerte va se lever).
6. **Arrêter** quand voulu.

Le simulateur gère plusieurs capteurs en parallèle.

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le menu Pays reste vide | Central non lancé / mauvais port | Vérifier que le central tourne sur `CENTRAL_URL` (8090) |
| Erreur 401/502 dans la console | Compte technique absent ou central protégé | Vérifier que le compte `simulateur@futurekawa.example` existe |
| Aucune alerte en mode Anomalie | Fréquence trop lente / hystérésis | Augmenter la fréquence ; l'alerte s'ouvre après N mesures consécutives |

---

## Pile technique

FastAPI · Uvicorn · httpx (appels au central) · paho-mqtt (publication MQTT) · Chart.js (graphe côté web).
