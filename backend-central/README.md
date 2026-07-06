# backend-central — Back-end central (siège)

Point d'entrée **sécurisé** du système. Il agrège les données des trois back-ends pays et expose une API consolidée au frontend. Il héberge également l'**annuaire d'identité** (comptes, rôles) et applique l'**authentification** et l'**isolation par pays**.

---

## Responsabilités

- **Agrégation multi-pays** : interroge les API des back-ends pays et consolide stocks, mesures et alertes, en taguant chaque donnée avec son `pays`.
- **Tolérance aux pannes** : si un pays est injoignable, il est marqué indisponible et les autres restent servis (dégradation gracieuse).
- **Authentification** : login → **JWT** (access token court + refresh token rotatif révocable).
- **Autorisation** : rôles (RBAC) + **isolation par pays** (un admin pays ne voit que son pays ; le super admin voit tout).
- **Gestion des comptes** : création, désactivation, changement de rôle, suppression (selon le périmètre).
- **Audit** : journalisation des actions sensibles.

---

## Lancement (IntelliJ)

Prérequis :
- L'infrastructure Docker tourne (la base **Identité** sur le port **5440** est nécessaire).
- Les back-ends pays tournent (sinon ils apparaissent `disponible: false`, ce qui est normal).

Lancer `CentralApplication` (profil par défaut). Démarre sur le port **8090**. Au démarrage, **Flyway** crée le schéma Identité (utilisateurs, rôles, permissions, audit, refresh tokens) et injecte les comptes de démonstration.

---

## Sécurité

### Authentification (JWT)
- `POST /auth/login` → `accessToken` (15 min) + `refreshToken` (7 j, stocké haché en base).
- `POST /auth/refresh` → rotation : l'ancien refresh est révoqué, de nouveaux jetons sont émis.
- `POST /auth/logout` → révoque le refresh token.
- `GET /auth/me` → profil de l'utilisateur courant.

Le JWT porte les *claims* : `roles` et `pays` (`*` = super admin, tous pays).

### Rôles
| Rôle | Périmètre | Vocation |
|---|---|---|
| SUPER_ADMIN | Tous les pays | Gère tout le groupe |
| ADMIN_PAYS | 1 pays | Gère les ressources et comptes de son pays |
| OPERATEUR | 1 pays | Saisie / acquittement |
| LECTEUR | 1 pays | Consultation seule |

### Isolation par pays
Sur toute route `/api/pays/{code}/…`, le pays demandé est comparé au `pays` du jeton : le super admin passe partout ; un admin pays n'accède qu'au sien (sinon **403**). Les routes globales (`/api/lots`, `/api/alertes`, `/api/pays`) sont **filtrées** selon le périmètre.

---

## Endpoints

### Authentification
| Méthode | Endpoint | Accès |
|---|---|---|
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Public (présente un refresh) |
| POST | `/auth/logout` | Public (présente un refresh) |
| GET | `/auth/me` | Authentifié |

### Consolidation
| Méthode | Endpoint | Accès |
|---|---|---|
| GET | `/api/pays` | Authentifié (périmètre) |
| GET | `/api/lots` | Authentifié (périmètre) |
| GET | `/api/alertes` | Authentifié (périmètre) |
| GET | `/api/pays/{code}/lots` | Authentifié + accès au pays |
| GET | `/api/pays/{code}/alertes` | Authentifié + accès au pays |
| GET | `/api/pays/{code}/lots/{lotId}/mesures` | Authentifié + accès au pays |
| GET | `/api/pays/{code}/entrepots/{entrepotId}/mesures` | Authentifié + accès au pays |
| GET | `/api/pays/{code}/exploitations` | Authentifié + accès au pays |
| GET | `/api/pays/{code}/exploitations/{expId}/entrepots` | Authentifié + accès au pays |
| GET | `/api/pays/{code}/entrepots/{entrepotId}/capteurs` | Authentifié + accès au pays |

### Gestion des comptes
| Méthode | Endpoint | Accès |
|---|---|---|
| GET | `/users` | SUPER_ADMIN, ADMIN_PAYS |
| GET | `/users/{id}` | SUPER_ADMIN, ADMIN_PAYS |
| POST | `/users` | SUPER_ADMIN, ADMIN_PAYS |
| PATCH | `/users/{id}/desactiver` | SUPER_ADMIN, ADMIN_PAYS |
| PATCH | `/users/{id}/activer` | SUPER_ADMIN, ADMIN_PAYS |
| PATCH | `/users/{id}/role` | SUPER_ADMIN, ADMIN_PAYS |
| DELETE | `/users/{id}` | SUPER_ADMIN |

### Audit
| Méthode | Endpoint | Accès |
|---|---|---|
| GET | `/audit` | SUPER_ADMIN, ADMIN_PAYS |

Swagger : http://localhost:8090/swagger-ui.html

**Codes de réponse** : `200` succès · `401` non authentifié · `403` interdit (rôle/pays) · `404` introuvable · `409` conflit · `400` requête invalide.

---

## Comptes de démonstration

Mot de passe **`Admin123!`** pour tous :

| Email | Rôle | Périmètre |
|---|---|---|
| `superadmin@futurekawa.example` | SUPER_ADMIN | Tous |
| `admin-bresil@futurekawa.example` | ADMIN_PAYS | Brésil |
| `admin-equateur@futurekawa.example` | ADMIN_PAYS | Équateur |
| `admin-colombie@futurekawa.example` | ADMIN_PAYS | Colombie |
| `simulateur@futurekawa.example` | LECTEUR | Compte technique |

> Comptes de démonstration — à remplacer pour tout usage réel. Le secret JWT (`app.securite.jwt-secret`) doit être fourni par variable d'environnement en production.

---

## Annuaire d'identité (base Identité, port 5440)

Tables principales : `utilisateur`, `role`, `permission`, `role_permission`, `utilisateur_role`, `refresh_token`, `journal_audit`. Le champ `pays` de l'utilisateur (`NULL` = tous pays) porte l'isolation.
