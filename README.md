# FutureKawa — Suivi de stocks de café vert multi-pays (back-end)

Solution applicative de **suivi des stocks** et de **surveillance des conditions de stockage** (température / humidité via IoT) pour FutureKawa, négociant de café vert présent dans **3 pays** : Brésil, Équateur, Colombie. Le siège consolide les données des trois pays via un back-end central sécurisé.

Projet MSPR — EPSI/WIS, RNCP35584, Bloc 4.

---

## Sommaire
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Structure du dépôt](#structure-du-dépôt)
- [Prérequis](#prérequis)
- [Démarrage complet (pas à pas)](#démarrage-complet-pas-à-pas)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Vérification rapide](#vérification-rapide)
- [Documentation](#documentation)

---

## Architecture

Architecture **distribuée multi-pays**, tolérante aux pannes :

- **3 back-ends pays** (même code, déployé 3 fois via des profils) : chacun a sa base PostgreSQL, ingère les mesures IoT en **MQTT**, gère les **lots** (FIFO) et lève des **alertes** (conditions hors plage + péremption > 365 j) avec envoi d'**emails**.
- **1 back-end central** (siège) : agrège les données des trois pays via leurs API REST, applique la **sécurité** (authentification JWT, rôles, isolation par pays) et expose une API consolidée au frontend.
- **Simulateur web** : génère des mesures réalistes par pays et les publie en MQTT, pour démontrer le système sans capteurs physiques.

```
        IoT / Simulateur ──MQTT──> Back-ends pays (BR/EC/CO) ──REST──> Back-end central ──> Frontend
                                        │  (PostgreSQL ×3)                 │ (sécurité JWT,
                                        └── alertes + emails               │  base Identité)
```

| Composant | Port | Base de données |
|---|---|---|
| Back-end pays — Brésil | 8080 | PostgreSQL :5432 |
| Back-end pays — Équateur | 8081 | PostgreSQL :5433 |
| Back-end pays — Colombie | 8082 | PostgreSQL :5434 |
| Back-end central (siège) | 8090 | PostgreSQL Identité :5440 |
| Simulateur web | 8050 | — |
| Broker MQTT (Mosquitto) | 1883 | — |
| Mailpit (SMTP de test) | 1025 / UI 8025 | — |

> Conditions idéales par pays (± tolérance 3 °C / 2 %) : **Brésil 29 °C / 55 %**, **Équateur 31 °C / 60 %**, **Colombie 26 °C / 80 %**.

---

## Stack technique

- **Java 21**, **Spring Boot 3.5.x**, **Maven**
- **PostgreSQL 17**, **Flyway** (migrations)
- **Spring Integration MQTT** (Paho) + **Mosquitto**
- **Spring Security + JWT** (authentification, rôles, isolation pays)
- **Spring Mail** + **Mailpit** (emails de test)
- **springdoc-openapi** (Swagger UI)
- **Docker / Docker Compose** (infrastructure)
- **Python / FastAPI** (simulateur web)

---

## Structure du dépôt

```
futurekawa/
├── backend-pays/        # Back-end d'un pays (déployé 3× via profils)
├── backend-central/     # Back-end central du siège (agrégation + sécurité)
├── simulateur-web/      # Simulateur de capteurs (FastAPI + interface web)
├── infra/               # docker-compose.yml (PostgreSQL ×4, Mosquitto, Mailpit)
└── docs/                # Documents d'analyse et de conception
```

Chaque module a son propre README détaillé (voir [Documentation](#documentation)).

---

## Prérequis

- **Docker Desktop** (pour l'infrastructure)
- **JDK 21** (Microsoft OpenJDK ou équivalent)
- **IntelliJ IDEA** (pour lancer les back-ends Java)
- **Maven** (intégré à IntelliJ)
- **Python 3.11+** (pour le simulateur web)

---

## Démarrage complet (pas à pas)

### 1. Lancer l'infrastructure (Docker)

```bash
cd infra
docker compose up -d
```
Cela démarre : 4 bases PostgreSQL (3 pays + Identité), le broker MQTT Mosquitto, et Mailpit. Vérifie :
```bash
docker compose ps
```
> Tous les conteneurs doivent être `Up`. Mailpit est consultable sur http://localhost:8025.

### 2. Lancer les 3 back-ends pays (IntelliJ)

Dans IntelliJ, ouvre le module `backend-pays` et crée **3 configurations de lancement** de `PaysApplication`, qui ne diffèrent que par le **profil actif** :

| Pays | Profils actifs (Active profiles) | Port | Base |
|---|---|---|---|
| Brésil | `dev` (par défaut) | 8080 | 5432 |
| Équateur | `dev,equateur` | 8081 | 5433 |
| Colombie | `dev,colombie` | 8082 | 5434 |

Lance les trois. Au démarrage, **Flyway** crée le schéma et injecte les données de démonstration propres à chaque pays.

### 3. Lancer le back-end central (IntelliJ)

Dans le module `backend-central`, lance `CentralApplication` (profil par défaut). Il démarre sur le port **8090** et applique les migrations de la base **Identité** (comptes, rôles).

### 4. Lancer le simulateur web (optionnel, pour la démo)

```bash
cd simulateur-web
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/Mac : source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app:app --port 8050
```
Interface : http://localhost:8050

---

## Comptes de démonstration

Tous avec le mot de passe **`Admin123!`** :

| Email | Rôle | Périmètre |
|---|---|---|
| `superadmin@futurekawa.example` | SUPER_ADMIN | Tous les pays |
| `admin-bresil@futurekawa.example` | ADMIN_PAYS | Brésil |
| `admin-equateur@futurekawa.example` | ADMIN_PAYS | Équateur |
| `admin-colombie@futurekawa.example` | ADMIN_PAYS | Colombie |
| `simulateur@futurekawa.example` | LECTEUR | Compte technique du simulateur |

> ⚠️ Comptes et mots de passe de **démonstration uniquement** — à changer pour tout usage réel.

---

## Vérification rapide

Une fois tout lancé, authentifie-toi et interroge le central :

```bash
# 1. Login -> récupère un accessToken
curl -X POST http://localhost:8090/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"superadmin@futurekawa.example\",\"motDePasse\":\"Admin123!\"}"

# 2. Liste consolidée des pays (remplace le token)
curl http://localhost:8090/api/pays -H "Authorization: Bearer <ACCESS_TOKEN>"
```
→ les 3 pays doivent apparaître avec `disponible: true`.

Documentation interactive des API (Swagger) :
- Central : http://localhost:8090/swagger-ui.html
- Back-end pays : http://localhost:8080/swagger-ui.html (et 8081 / 8082)

---

## Documentation

- `backend-pays/README.md` — back-end d'un pays (profils, MQTT, alertes)
- `backend-central/README.md` — back-end central (agrégation, sécurité)
- `simulateur-web/README.md` — simulateur de capteurs
- `docs/` — analyses : architecture, multi-pays, cycle de vie des alertes, conception sécurité, référentiel des API

---

## Notes

- Les emails partent vers **Mailpit** (faux SMTP) — aucune vraie adresse n'est contactée. Consultez-les sur http://localhost:8025.
- Pour la **démonstration**, certains intervalles sont volontairement raccourcis (rappels d'alerte, vérifications planifiées). Les valeurs « production » sont indiquées dans le README de `backend-pays`.
- **Évolution prévue** : conteneurisation des back-ends Java (profil `docker` déjà préparé) pour un démarrage entièrement via `docker compose up`.
