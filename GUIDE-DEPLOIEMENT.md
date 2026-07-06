# FutureKawa — Guide de déploiement (Docker)

Lancer **tout le back-end** (3 pays + central + bases + MQTT + e-mail + simulateur) en quelques commandes, pour que l'équipe front puisse intégrer sans connaître l'architecture interne.

---

## 1. Architecture de déploiement

Tous les services tournent dans des conteneurs Docker reliés par un **réseau privé**. Les conteneurs se parlent par leur **nom** (ex. le central appelle `http://fk-pays-bresil:8080`). Seuls les ports utiles sont exposés à votre machine.

```
                          ┌────────────────────────────────────┐
   Front-end  ───HTTP───▶ │  fk-central  (:8090)  API sécurisée │
   (navigateur)           └──────┬───────────────┬─────────────┘
                                 │ REST          │ JDBC
              ┌──────────────────┼───────────────┴───────────┐
              ▼                  ▼                            ▼
        fk-pays-bresil    fk-pays-equateur            fk-postgres-identite
        fk-pays-colombie  (…chacun sa base PostgreSQL…)   (base Identité)
              ▲
              │ MQTT (mesures)
        fk-mosquitto ◀─── fk-simulateur (démo)
        fk-mailpit  (e-mails de test, UI :8025)
```

| Composant | Rôle |
|---|---|
| **4 × PostgreSQL** | une base par pays (Brésil/Équateur/Colombie) + une base Identité (central) |
| **3 × back-end pays** | même image déployée 3 fois (profils `dev` / `dev,equateur` / `dev,colombie`) |
| **back-end central** | agrégation + sécurité (JWT, rôles, isolation pays) |
| **Mosquitto** | broker MQTT (réception des mesures capteurs) |
| **Mailpit** | faux serveur SMTP : capture les e-mails, consultables sur http://localhost:8025 |
| **simulateur** | génère des mesures et les publie en MQTT (démo sans matériel) |

---

## 2. Prérequis

- **Docker Desktop** installé et démarré.
- Le code des 3 modules (`backend-pays`, `backend-central`, `simulateur-web`) présent dans le dépôt.
- Rien d'autre : pas besoin de Java, Maven ni Python sur la machine — tout est construit dans les conteneurs.

---

## 3. Fichiers à mettre en place

Placez ces fichiers dans le dépôt comme suit :

```
futurekawa/
├── docker-compose.full.yml          ← orchestrateur (fourni)
├── .env                             ← copié depuis .env.example
├── infra/
│   └── mosquitto.conf               ← (fourni)
├── backend-pays/
│   ├── Dockerfile                   ← (fourni)
│   └── src/main/resources/application-docker.yml   ← (fourni, à adapter)
├── backend-central/
│   ├── Dockerfile                   ← (fourni)
│   └── src/main/resources/application-docker.yml   ← (fourni, à adapter)
└── simulateur-web/
    └── Dockerfile                   ← (fourni)
```

### ⚠️ 3 points à adapter à votre projet (one-time)

1. **`backend-pays/.../application-docker.yml`** → mettez la **clé MQTT exacte** de votre `application.yml` (ex. `mqtt.broker-url`), avec l'hôte `fk-mosquitto`.
2. **`backend-central/.../application-docker.yml`** → reprenez la **structure exacte de votre annuaire de pays** (lu par `PaysProperties`), en changeant juste les URLs vers `fk-pays-bresil:8080`, `fk-pays-equateur:8081`, `fk-pays-colombie:8082`.
3. **CORS** (voir §7) → indispensable pour que le navigateur du front puisse appeler le central.

---

## 4. Variables d'environnement

Définies dans `.env` (copié depuis `.env.example`) :

| Variable | Rôle | Défaut |
|---|---|---|
| `DB_USER` | utilisateur PostgreSQL (toutes les bases) | `futurekawa` |
| `DB_PASSWORD` | mot de passe PostgreSQL | `futurekawa` |
| `JWT_SECRET` | secret de signature des jetons JWT | *(à changer en prod)* |

> Les URLs de bases, profils Spring et hôtes (MQTT, mail, pays) sont déjà injectés par `docker-compose.full.yml` — vous n'avez pas à les renseigner.

---

## 5. Commandes de démarrage

```bash
# 1. Préparer les variables d'environnement
cp .env.example .env        # (éditez JWT_SECRET si besoin)

# 2. Construire les images et tout démarrer
docker compose -f docker-compose.full.yml up -d --build

# 3. Suivre le démarrage (optionnel)
docker compose -f docker-compose.full.yml logs -f fk-central
```

Le premier `up` compile les 3 apps Java (quelques minutes). Les fois suivantes sont quasi instantanées.

**Arrêter / réinitialiser :**
```bash
# Arrêter (conserve les données)
docker compose -f docker-compose.full.yml down

# Tout réinitialiser (efface les bases → seeds rejoués au prochain démarrage)
docker compose -f docker-compose.full.yml down -v
```

---

## 6. Ports utilisés

| Service | URL / port (depuis votre machine) |
|---|---|
| Back-end central (API) | http://localhost:8090 |
| Back-end pays — Brésil | http://localhost:8080 |
| Back-end pays — Équateur | http://localhost:8081 |
| Back-end pays — Colombie | http://localhost:8082 |
| Simulateur web | http://localhost:8050 |
| Mailpit (e-mails de test) | http://localhost:8025 |
| Broker MQTT | localhost:1883 |
| PostgreSQL Brésil / EC / CO / Identité | 5432 / 5433 / 5434 / 5440 |
| Swagger central | http://localhost:8090/swagger-ui.html |

> Le **front-end** n'a besoin que d'**une seule URL** : `http://localhost:8090` (le central).

---

## 7. CORS — à configurer pour le front (IMPORTANT)

Un front-end servi sur un autre port (ex. Vite `http://localhost:5173`) sera **bloqué par le navigateur** s'il appelle le central sans autorisation CORS. Ajoutez ceci dans `backend-central`.

Dans `SecurityConfig.java`, activez CORS sur la chaîne de filtres :
```java
http
    .cors(org.springframework.security.config.Customizer.withDefaults())
    .csrf(csrf -> csrf.disable())
    // … le reste inchangé …
```

Puis ajoutez ce bean (même classe ou une classe de config dédiée) :
```java
@org.springframework.context.annotation.Bean
public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
    var cfg = new org.springframework.web.cors.CorsConfiguration();
    cfg.setAllowedOrigins(java.util.List.of(
        "http://localhost:5173",   // Vite
        "http://localhost:3000"    // CRA / autre
    ));
    cfg.setAllowedMethods(java.util.List.of("GET","POST","PATCH","PUT","DELETE","OPTIONS"));
    cfg.setAllowedHeaders(java.util.List.of("*"));
    var src = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/**", cfg);
    return src;
}
```
> Sans cela, le front verra des erreurs « CORS policy » dans la console alors que les `curl` fonctionnent. C'est l'écueil n°1 de l'intégration front/back.

---

## 8. Vérifications (le système tourne-t-il ?)

```bash
# A. Tous les conteneurs sont "Up" / "healthy"
docker compose -f docker-compose.full.yml ps

# B. Les 3 pays répondent (health check)
curl http://localhost:8080/actuator/health
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
# → {"status":"UP"}

# C. Le central agrège les 3 pays (après login, voir guide de test)
#    Les 3 pays doivent apparaître "disponible": true.

# D. Les e-mails de test arrivent bien
#    Ouvrir http://localhost:8025 (interface Mailpit)
```

**Checklist de bon fonctionnement :**
- [ ] `docker compose ps` : tous les services `Up` (bases `healthy`).
- [ ] Les 3 `/actuator/health` renvoient `UP`.
- [ ] `POST /auth/login` renvoie un `accessToken` (voir guide de test).
- [ ] `GET /api/pays` liste 3 pays `disponible: true`.
- [ ] Swagger accessible : http://localhost:8090/swagger-ui.html.

---

## 9. En cas de souci

| Symptôme | Cause probable | Solution |
|---|---|---|
| Un pays `disponible: false` | annuaire mal adapté (§3.2) | vérifier les URLs `fk-pays-*` dans `application-docker.yml` central |
| Pas de mesures reçues | clé MQTT mal adaptée (§3.1) | aligner la clé MQTT sur votre `application.yml`, hôte `fk-mosquitto` |
| Erreurs « CORS » côté front | CORS non configuré | appliquer §7 |
| `port is already allocated` | un service local occupe déjà le port | arrêter l'ancien (ex. instances IntelliJ, anciens conteneurs `infra`) |
| Build Java échoue | structure Maven différente | vérifier que chaque module a son `pom.xml` à la racine du contexte |

---

## 10. Alternative : infra en Docker + apps en IntelliJ

Si la conteneurisation des apps pose souci le jour J, repli immédiat : lancez **seulement l'infra** en Docker (bases + MQTT + Mailpit) et les 4 apps depuis IntelliJ (comme aujourd'hui). Le front voit exactement la même API sur `http://localhost:8090`. C'est moins « une commande », mais 100 % fonctionnel.
