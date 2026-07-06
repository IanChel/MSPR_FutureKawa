# backend-pays — Back-end d'un pays

Back-end **mutualisé** déployé une fois par pays (Brésil, Équateur, Colombie). Le pays n'est **pas** une donnée de branchement dans le code : c'est un **profil de configuration**. Ajouter un pays = ajouter un profil + une base, sans modifier le code.

---

## Responsabilités

- Exposer le **référentiel** (exploitations, entrepôts, capteurs) du pays.
- Gérer les **lots** de café vert (création, consultation, tri **FIFO** par date de stockage).
- **Ingérer les mesures IoT** (température / humidité) reçues en **MQTT** et les persister.
- Exposer l'**historique des mesures** (courbes).
- Gérer le **cycle de vie des alertes** : ouverture (avec hystérésis), rappels périodiques, acquittement, résolution automatique, péremption (> 365 j).
- Envoyer des **emails** au responsable du pays (via Mailpit en dev).

---

## Lancement (IntelliJ)

Prérequis : l'infrastructure Docker doit tourner (`infra/`, voir README racine).

Créer **3 configurations de lancement** de `PaysApplication`, identiques sauf le **profil actif** :

| Pays | Active profiles | Port | Base PostgreSQL |
|---|---|---|---|
| Brésil | `dev` | 8080 | localhost:5432 |
| Équateur | `dev,equateur` | 8081 | localhost:5433 |
| Colombie | `dev,colombie` | 8082 | localhost:5434 |

> Le port et la base sont déterminés par le profil. Lancer la mauvaise configuration ferait pointer le mauvais pays sur le mauvais port.

Au démarrage, **Flyway** applique le schéma commun (`db/migration`) puis le **seed propre au pays** (`db/seed/<pays>`).

---

## Configuration par pays

Chaque profil (`application.yml` = Brésil, `application-equateur.yml`, `application-colombie.yml`) définit :

| Paramètre | Brésil | Équateur | Colombie |
|---|---|---|---|
| Température idéale | 29 °C | 31 °C | 26 °C |
| Humidité idéale | 55 % | 60 % | 80 % |
| Tolérance | ± 3 °C / ± 2 % | ± 3 °C / ± 2 % | ± 3 °C / ± 2 % |
| Topic MQTT | `futurekawa/bresil/+/mesures` | `futurekawa/equateur/+/mesures` | `futurekawa/colombie/+/mesures` |
| Destinataire email | responsable-bresil | responsable-equateur | responsable-colombie |

---

## Ingestion MQTT

- **Topic** : `futurekawa/{pays}/{entrepot}/mesures`
- **Payload** (JSON) :
```json
{
  "capteurId": "capteur-bresil-e1",
  "temperature": 29.4,
  "humidite": 55.2,
  "timestamp": "2026-06-21T10:00:00Z"
}
```
À chaque mesure reçue : persistance + évaluation des conditions (déclenchement / mise à jour / résolution d'alerte).

---

## Cycle de vie des alertes

Une alerte modélise un **incident** (période continue d'anomalie), pas chaque mesure :

1. **Ouverture** après N mesures consécutives hors plage (hystérésis anti-rebond) → email + lots passés `EN_ALERTE`.
2. **Suivi** : mémorisation de la pire valeur observée, sans renotifier à chaque mesure.
3. **Rappels** périodiques tant que l'incident est `ACTIVE` (throttlés).
4. **Acquittement** (`PATCH /alertes/{id}/acquitter`) : stoppe les rappels sans clôturer.
5. **Résolution automatique** après N mesures normales consécutives → email de résolution (avec durée) + lots remis `CONFORME`.
6. **Péremption** : tâche planifiée, lot > 365 j → statut `PERIME` + alerte (anti-doublon).

États : `ACTIVE` → `ACQUITTEE` → `RESOLUE`.

---

## Endpoints

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/exploitations` | Exploitations du pays |
| GET | `/exploitations/{id}/entrepots` | Entrepôts d'une exploitation |
| GET | `/entrepots/{id}/capteurs` | Capteurs d'un entrepôt |
| POST | `/lots` | Créer un lot |
| GET | `/lots` | Lister les lots (FIFO ; filtres entrepôt/statut) |
| GET | `/lots/{id}` | Détail d'un lot |
| GET | `/entrepots/{id}/mesures` | Historique des mesures d'un entrepôt |
| GET | `/lots/{id}/mesures` | Mesures depuis le stockage d'un lot |
| GET | `/alertes` | Lister les alertes (filtres `statut`, `type`) |
| PATCH | `/alertes/{id}/acquitter` | Acquitter une alerte |
| PATCH | `/alertes/{id}/resoudre` | Résoudre une alerte |

Swagger : http://localhost:8080/swagger-ui.html (et 8081 / 8082).

---

## Valeurs démo vs production

Pour la démonstration, certains intervalles sont raccourcis. **Avant un usage réel / le rendu final**, restaurer :

| Paramètre | Démo | Production |
|---|---|---|
| `app.alerte.rappel-intervalle-minutes` | 1 | 30 |
| `envoyerRappels` (`@Scheduled`) | `initialDelay=10s, fixedRate=15s` | `initialDelay=60s, fixedRate=60s` |
| `evaluerPeremptions` (`@Scheduled`) | — | `initialDelay=5s, fixedRate=3600000` (1 h) |

---

## Recréer une base vierge

Si un seed change, recréer la base concernée (Flyway ne rejoue pas une migration déjà appliquée) :
```bash
cd infra
docker compose down
docker volume rm infra_pgdata        # Brésil (ou infra_pgdata_ec / infra_pgdata_co)
docker compose up -d
```
