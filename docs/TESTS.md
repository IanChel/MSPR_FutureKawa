# Tests — exécution manuelle

Ce document décrit comment lancer **manuellement** la suite de tests automatisés du
projet FutureKawa (livrable « tests lançables manuellement »). Les mêmes commandes
sont rejouées automatiquement par la chaîne d'intégration continue.

Au total : **31 tests** — 22 sur les back-ends Java, 9 sur le front-end React.

---

## Pré-requis

| Composant | Outil | Version | Remarque |
|---|---|---|---|
| Back-ends Java | JDK | **21** | `JAVA_HOME` doit pointer vers un JDK 21 |
| Back-ends Java | Maven | — | **inutile d'installer Maven** : chaque module embarque un *wrapper* (`mvnw`) qui le télécharge tout seul |
| Front-end | Node.js | 18+ | npm fourni avec Node |

> Les tests back-end sont **unitaires** : ils ne nécessitent **ni base de données,
> ni broker MQTT, ni serveur démarré**. Les dépendances externes sont simulées
> (Mockito). On peut donc les lancer sans démarrer l'infrastructure Docker.

### Positionner JAVA_HOME sur le JDK 21

```bash
# Windows (PowerShell) — pour la session courante
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"

# Linux / macOS
export JAVA_HOME=/chemin/vers/jdk-21
```

---

## 1. Back-end pays (16 tests)

```bash
cd backend-pays

# Windows
mvnw.cmd test

# Linux / macOS
./mvnw test
```

Tests couverts :

| Classe de test | Ce qui est vérifié |
|---|---|
| `SeuilConfigTest` | Bande acceptable température/humidité (idéal ± tolérance), bornes incluses, valeurs hors plage. Jeu de données : Brésil 29 °C / 55 %, tolérance ±3 °C / ±2 %. |
| `HysteresisTrackerTest` | Compteurs de mesures consécutives (anti-flapping), remise à zéro croisée, isolation par entrepôt. |
| `AlerteServiceTest` | Ouverture d'une alerte « conditions » après 3 mesures consécutives hors plage ; alerte « péremption » pour un lot stocké depuis plus de 365 jours ; garde anti-doublon. |

## 2. Back-end central (6 tests)

```bash
cd backend-central

# Windows
mvnw.cmd test

# Linux / macOS
./mvnw test
```

Tests couverts :

| Classe de test | Ce qui est vérifié |
|---|---|
| `ConsolidationServiceTest` | Fusion des données de plusieurs pays avec ajout du code pays ; **tolérance aux pannes** (un pays injoignable est ignoré, les autres restent consolidés) ; rejet d'un code pays inconnu (404). |
| `IsolationPaysServiceTest` | Isolation par pays : un super admin accède à tous les pays, un admin pays n'accède qu'au sien (403 sinon). |

## 3. Front-end React (9 tests)

```bash
cd front-end
npm install      # première fois uniquement
npm test
```

Tests couverts :

| Fichier de test | Ce qui est vérifié |
|---|---|
| `auth-helpers.test.js` | Fonctions d'affichage de l'utilisateur : initiales, nom affiché, libellé de rôle/pays (avec repli sur l'email et valeurs par défaut). |

---

## Où lire les résultats

- **Console** : un résumé `Tests run: N, Failures: 0, Errors: 0` suivi de `BUILD SUCCESS`
  (back-end) ou `Tests N passed` (front-end).
- **Rapports détaillés back-end** : `backend-*/target/surefire-reports/` (un fichier
  `.txt` et `.xml` par classe de test) — c'est ce répertoire qu'exploite l'intégration
  continue pour publier les résultats.

## Lancer un seul test (optionnel)

```bash
# back-end : une seule classe
mvnw.cmd test -Dtest=AlerteServiceTest

# front-end : en mode interactif (watch)
npx vitest
```
