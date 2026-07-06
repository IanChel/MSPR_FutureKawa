# FutureKawa — Guide de test pour l'équipe front-end

Tout ce qu'il faut pour **intégrer et tester** le back-end sans connaître son fonctionnement interne : URLs, comptes, jetons, liste des API, exemples cURL, scénarios et données de démonstration.

> Le front ne parle qu'à **une seule URL** : le back-end central, `http://localhost:8090`.

---

## 1. URLs des services

| Service | URL |
|---|---|
| **API (central)** | `http://localhost:8090` |
| Documentation interactive (Swagger) | `http://localhost:8090/swagger-ui.html` |
| E-mails de test (Mailpit) | `http://localhost:8025` |
| Simulateur de capteurs | `http://localhost:8050` |

---

## 2. Comptes de démonstration

Mot de passe identique pour tous : **`Admin123!`**

| Rôle | E-mail | Périmètre | Voit |
|---|---|---|---|
| **Super Admin** | `superadmin@futurekawa.example` | Tous les pays | tout |
| **Admin Pays** | `admin-bresil@futurekawa.example` | Brésil | son pays |
| **Admin Pays** | `admin-equateur@futurekawa.example` | Équateur | son pays |
| **Admin Pays** | `admin-colombie@futurekawa.example` | Colombie | son pays |
| **Lecteur** (technique) | `simulateur@futurekawa.example` | — | lecture seule |

> Pour tester un **Employé/Opérateur**, créez-en un via `POST /users` (voir §5).

---

## 3. Obtenir un jeton JWT

L'API est sécurisée : il faut un **access token** dans l'en-tête `Authorization: Bearer <token>`.

### Procédure
```bash
curl -X POST http://localhost:8090/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@futurekawa.example","motDePasse":"Admin123!"}'
```
Réponse :
```json
{
  "accessToken": "eyJhbGci…",
  "refreshToken": "t10-weBJ…",
  "type": "Bearer"
}
```

- **accessToken** : à mettre dans chaque appel (`Authorization: Bearer …`). Durée de vie **15 min**.
- **refreshToken** : pour obtenir un nouvel access token sans se reconnecter (durée 7 j).

### En cas de 401 « expiré »
Appelez `/auth/refresh` avec le refresh token → nouveaux jetons (l'ancien refresh est révoqué) :
```bash
curl -X POST http://localhost:8090/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH>"}'
```

> **Astuce front** : interceptez les `401`, tentez un `/auth/refresh` automatique, rejouez la requête ; si le refresh échoue → redirigez vers la page de connexion.

---

## 4. Liste complète des API (côté central)

Rôles : SA = Super Admin · AP = Admin Pays · OP = Opérateur · LE = Lecteur.
« périmètre » = filtré selon le pays du jeton.

### Authentification
| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| POST | `/auth/login` | public | e-mail + mot de passe → jetons |
| POST | `/auth/refresh` | public (refresh) | renouvelle les jetons (rotation) |
| POST | `/auth/logout` | public (refresh) | révoque le refresh token |
| GET | `/auth/me` | authentifié | profil courant (id, e-mail, pays, rôles) |

### Consolidation (données métier)
| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/api/pays` | tous (périmètre) | pays + disponibilité |
| GET | `/api/lots` | tous (périmètre) | lots (tous pays ou le sien) |
| GET | `/api/alertes` | tous (périmètre) | alertes (tous pays ou le sien) |
| GET | `/api/pays/{code}/lots` | + accès pays | lots d'un pays |
| GET | `/api/pays/{code}/alertes` | + accès pays | alertes d'un pays |
| GET | `/api/pays/{code}/lots/{lotId}/mesures` | + accès pays | mesures d'un lot |
| GET | `/api/pays/{code}/entrepots/{id}/mesures` | + accès pays | mesures d'un entrepôt |
| GET | `/api/pays/{code}/exploitations` | + accès pays | exploitations |
| GET | `/api/pays/{code}/exploitations/{id}/entrepots` | + accès pays | entrepôts |
| GET | `/api/pays/{code}/entrepots/{id}/capteurs` | + accès pays | capteurs |

### Actions métier (écriture)
| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| POST | `/api/pays/{code}/lots` | + accès pays | créer un lot |
| PATCH | `/api/pays/{code}/alertes/{id}/acquitter` | + accès pays | acquitter une alerte |
| PATCH | `/api/pays/{code}/alertes/{id}/resoudre` | + accès pays | résoudre une alerte |

### Gestion des utilisateurs
| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/users` | SA, AP | liste (périmètre) |
| GET | `/users/{id}` | SA, AP | détail |
| POST | `/users` | SA, AP | créer un compte |
| PATCH | `/users/{id}/desactiver` | SA, AP | désactiver |
| PATCH | `/users/{id}/activer` | SA, AP | réactiver |
| PATCH | `/users/{id}/role` | SA, AP | changer le rôle |
| DELETE | `/users/{id}` | SA | supprimer |

### Audit
| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/audit` | SA, AP | journal des actions sensibles |

---

## 5. Exemples cURL des endpoints importants

> Remplacez `<TOKEN>` par votre access token. Sous Windows CMD, mettez la commande sur **une seule ligne** et utilisez `\"` pour les guillemets.

**Profil courant**
```bash
curl http://localhost:8090/auth/me -H "Authorization: Bearer <TOKEN>"
```

**Liste des pays (consolidée)**
```bash
curl http://localhost:8090/api/pays -H "Authorization: Bearer <TOKEN>"
```

**Lots d'un pays**
```bash
curl http://localhost:8090/api/pays/BRESIL/lots -H "Authorization: Bearer <TOKEN>"
```

**Mesures d'un entrepôt (pour les courbes)**
```bash
curl "http://localhost:8090/api/pays/BRESIL/entrepots/1/mesures" -H "Authorization: Bearer <TOKEN>"
```

**Alertes d'un pays**
```bash
curl "http://localhost:8090/api/pays/BRESIL/alertes" -H "Authorization: Bearer <TOKEN>"
```

**Créer un lot**
```bash
curl -X POST http://localhost:8090/api/pays/BRESIL/lots \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"reference":"LOT-BR-DEMO-01","exploitationId":1,"entrepotId":1}'
```

**Acquitter / résoudre une alerte** (récupérez un `id` via la liste des alertes)
```bash
curl -X PATCH http://localhost:8090/api/pays/BRESIL/alertes/18/acquitter -H "Authorization: Bearer <TOKEN>"
curl -X PATCH http://localhost:8090/api/pays/BRESIL/alertes/18/resoudre  -H "Authorization: Bearer <TOKEN>"
```

**Lister / créer un utilisateur**
```bash
curl http://localhost:8090/users -H "Authorization: Bearer <TOKEN>"

curl -X POST http://localhost:8090/users \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"email":"operateur-br@futurekawa.example","motDePasse":"Operateur123!","nom":"Silva","prenom":"Joao","pays":"BRESIL","role":"OPERATEUR"}'
```

**Journal d'audit**
```bash
curl http://localhost:8090/audit -H "Authorization: Bearer <TOKEN>"
```

---

## 6. Scénarios de test principaux

### Scénario A — Connexion par rôle
1. Login `superadmin` → `GET /api/pays` renvoie **3 pays**.
2. Login `admin-equateur` → `GET /api/lots` ne renvoie **que l'Équateur**.

### Scénario B — Isolation par pays (sécurité)
- Avec le token **admin-equateur**, appeler `GET /api/pays/BRESIL/lots` → **403** (hors périmètre).
- Avec **superadmin**, le même appel → **200**.

### Scénario C — Cycle d'une alerte (de bout en bout)
1. Ouvrir le simulateur (http://localhost:8050), choisir **Brésil**, mode **Anomalie**, démarrer.
2. Après quelques secondes : `GET /api/pays/BRESIL/alertes` montre une alerte **ACTIVE**.
3. **Acquitter** l'alerte (`PATCH …/acquitter`) → statut **ACQUITTEE**.
4. Repasser le simulateur en **Normal** (ou **Résoudre** manuellement) → statut **RESOLUE**.
5. Un e-mail apparaît dans Mailpit (http://localhost:8025).

### Scénario D — Création de lot
- `POST /api/pays/BRESIL/lots` → 200 + lot créé ; il apparaît dans `GET /api/pays/BRESIL/lots`.

### Scénario E — Gestion de compte (Super Admin)
- Créer un opérateur (`POST /users`), le désactiver (`PATCH …/desactiver`), vérifier qu'il ne peut plus se connecter (login → **403** « Compte désactivé »), le réactiver.

### Scénario F — Session
- `login` → `refresh` → l'ancien refresh est **rejeté** (401) ; `logout` → le refresh courant est rejeté.

---

## 7. Données de démonstration disponibles

Chargées automatiquement au démarrage (Flyway). Aperçu indicatif :

### Pays et seuils (conditions idéales ± 3 °C / ± 2 %)
| Pays | Code | Température cible | Humidité cible |
|---|---|---|---|
| Brésil | `BRESIL` | 29 °C | 55 % |
| Équateur | `EQUATEUR` | 31 °C | 60 % |
| Colombie | `COLOMBIE` | 26 °C | 80 % |

### Référentiel (par pays)
- **Exploitations** (fazendas / fincas), chacune avec des **entrepôts**, chacun avec des **capteurs** (identifiants MQTT).
- IDs utiles pour tester : `exploitationId=1`, `entrepotId=1` existent dans chaque pays.

### Lots
- Plusieurs lots par pays, avec statut **CONFORME**.
- Au moins un lot **périmé** de démonstration (> 365 jours) côté Brésil → génère une alerte de péremption (ex. `LOT-BR-2025-014`).

### Alertes
- Des alertes **RESOLUE** d'historique (résolues AUTO/MANUEL) + des alertes **ACTIVE** générables à la demande via le simulateur.

> Les valeurs exactes (nombre de lots, IDs) peuvent évoluer selon les seeds. Utilisez les endpoints de liste (`/api/pays/{code}/exploitations`, `/lots`, `/alertes`) pour découvrir les IDs réels avant de tester les détails.

---

## 8. Codes de réponse à gérer côté front

| Code | Signification | Réaction front conseillée |
|---|---|---|
| 200 | Succès | — |
| 401 | Non authentifié (jeton absent/expiré) | tenter `/auth/refresh`, sinon login |
| 403 | Interdit (rôle ou pays hors périmètre) | message « accès non autorisé » |
| 404 | Ressource introuvable | message dédié |
| 409 | Conflit (ex. e-mail déjà utilisé) | message au formulaire |
| 400 | Requête invalide (garde-fous métier) | afficher le `message` renvoyé |

Le corps d'erreur est normalisé :
```json
{ "status": 409, "message": "Cet email est déjà utilisé" }
```

---

## 9. Démarrage ultra-rapide (résumé)

```bash
cp .env.example .env
docker compose -f docker-compose.full.yml up -d --build
# attendre ~1-2 min, puis :
curl -X POST http://localhost:8090/auth/login -H "Content-Type: application/json" \
  -d '{"email":"superadmin@futurekawa.example","motDePasse":"Admin123!"}'
# → copier accessToken, et c'est parti.
```
Documentation interactive : http://localhost:8090/swagger-ui.html
