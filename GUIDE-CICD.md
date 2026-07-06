# FutureKawa — Guide CI/CD Jenkins + Azure AKS

Ce guide explique comment le pipeline de déploiement fonctionne et ce que chaque membre de l'équipe doit faire selon son rôle.

---

## Qui fait quoi ?

| Rôle | Responsabilité |
|---|---|
| **Développeur** | Pousse du code sur `main` → déclenche automatiquement le pipeline |
| **Superviseur / Admin** | Valide le déploiement de TEST vers PRODUCTION dans Jenkins |
| **Admin Jenkins** (1 fois) | Configure les credentials et les clusters AKS |

---

## Vue d'ensemble du pipeline

```
Push sur main
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│  INTÉGRATION CONTINUE (automatique)                             │
│                                                                 │
│  1. Tests back-end pays      (Maven)                            │
│  2. Tests back-end central   (Maven)                            │
│  3. Tests front-end          (npm test)                         │
│  4. Packaging                (JARs + build front)               │
│  5. Build images Docker      (backend-pays + backend-central)   │
└─────────────────────────────────────────────────────────────────┘
     │  si tout est vert
     ▼
┌─────────────────────────────────────────────────────────────────┐
│  DÉPLOIEMENT CONTINU (automatique)                              │
│                                                                 │
│  6. Push images → Docker Hub   (tarekize/futurekawa-*)          │
│  7. Déploiement sur cluster TEST (Azure AKS)                    │
└─────────────────────────────────────────────────────────────────┘
     │  pipeline en PAUSE
     ▼
┌─────────────────────────────────────────────────────────────────┐
│  ⏸  APPROBATION SUPERVISEUR  (manuelle)                        │
│                                                                 │
│  Le superviseur vérifie l'environnement TEST, puis clique       │
│  "Déployer en production" dans Jenkins.                         │
│  Sans action → annulation automatique après 24 h.               │
└─────────────────────────────────────────────────────────────────┘
     │  si validé
     ▼
┌─────────────────────────────────────────────────────────────────┐
│  DÉPLOIEMENT PRODUCTION (automatique après validation)          │
│                                                                 │
│  8. Déploiement sur cluster PRODUCTION (Azure AKS)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Partie 1 — Pour les développeurs : pousser du code

### Prérequis

- Avoir accès au dépôt Git.
- Travailler sur une **branche de feature** (pas directement sur `main`).

### Étapes au quotidien

**1. Créer une branche depuis `main` à jour**

```bash
git checkout main
git pull origin main
git checkout -b feature/ma-fonctionnalite
```

**2. Coder, committer, pousser la branche**

```bash
git add .
git commit -m "feat: description de la fonctionnalité"
git push origin feature/ma-fonctionnalite
```

> A ce stade, Jenkins ne fait rien : le CD ne se déclenche que sur `main`.

**3. Ouvrir une Pull Request vers `main`**

Sur GitHub/GitLab, créer une PR de `feature/ma-fonctionnalite` → `main`.  
Faire relire le code par un autre membre avant de merger.

**4. Merger la PR dans `main`**

Dès que la PR est mergée, Jenkins démarre automatiquement le pipeline.

```
merge PR → main
    └─▶ Jenkins détecte le push
            └─▶ Tests → Packaging → Build Docker → Push Hub → Deploy TEST
                                                           └─▶ ⏸ attente superviseur
```

**5. Surveiller l'avancement dans Jenkins**

Ouvrir l'interface Jenkins : `http://<adresse-jenkins>:8080`

- Aller dans le projet **FutureKawa**
- Cliquer sur le build en cours (cercle bleu clignotant)
- Consulter la **Blue Ocean View** pour voir les étapes en temps réel

Si une étape est rouge → le build a échoué (voir les logs de l'étape concernée).

---

## Partie 2 — Pour le superviseur : valider le déploiement en production

Une fois l'environnement TEST déployé, Jenkins envoie une notification et met le pipeline en pause.

### Étape 1 — Vérifier l'environnement TEST

Avant de valider, s'assurer que tout fonctionne sur TEST :

```bash
# Récupérer l'IP publique du back-end central (TEST)
kubectl get service fk-central -n futurekawa-test

# Tester la santé des services
curl http://<IP-TEST>:8090/actuator/health
# → {"status":"UP"}

# Tester la liste des pays (après login)
curl http://<IP-TEST>:8090/api/pays \
  -H "Authorization: Bearer <token>"
# → 3 pays avec "disponible": true
```

Points à vérifier :
- [ ] Les 4 services sont `Running` dans le namespace `futurekawa-test`
- [ ] Le back-end central répond sur `/actuator/health`
- [ ] Les 3 back-ends pays répondent
- [ ] Le login fonctionne (`POST /auth/login`)

```bash
# Vérifier que tous les pods sont Running
kubectl get pods -n futurekawa-test
```

```
NAME                           READY   STATUS    RESTARTS
fk-central-5d8f9c-xxx          2/2     Running   0
fk-pays-br-7b4d2f-xxx          1/1     Running   0
fk-pays-ec-6c3a1b-xxx          1/1     Running   0
fk-pays-co-9e1f4d-xxx          1/1     Running   0
fk-mosquitto-3a2b1c-xxx        1/1     Running   0
```

### Étape 2 — Approuver dans Jenkins

1. Aller sur `http://<adresse-jenkins>:8080`
2. Ouvrir le projet **FutureKawa** → cliquer sur le build en cours
3. L'étape **"Approbation superviseur"** est mise en pause avec un bouton

![Bouton Jenkins Input](https://www.jenkins.io/images/post-images/blueocean/pipeline-paused.png)

4. Cliquer sur **"Déployer en production"**
5. (Optionnel) Ajouter une note de validation dans le champ texte
6. Jenkins continue automatiquement le déploiement en PRODUCTION

> **Refuser** → cliquer sur "Abort" : le pipeline s'arrête, la production n'est pas touchée.

### Étape 3 — Vérifier la production

```bash
# IP publique du back-end central (PROD)
kubectl get service fk-central -n futurekawa-prod

# Santé
curl http://<IP-PROD>:8090/actuator/health
```

---

## Partie 3 — Configuration initiale (admin, une seule fois)

### A. Credentials dans Jenkins

Aller dans **Gérer Jenkins → Credentials → Système → Global credentials → Add Credentials**

| Credential ID | Type | Valeur |
|---|---|---|
| `docker-hub-credentials` | Username with password | Login + mot de passe Docker Hub |
| `kubeconfig-aks-test` | Secret file | Fichier kubeconfig du cluster AKS TEST |
| `kubeconfig-aks-prod` | Secret file | Fichier kubeconfig du cluster AKS PROD |

**Obtenir le kubeconfig Azure AKS :**

```bash
# Cluster TEST
az aks get-credentials --resource-group rg-futurekawa --name aks-futurekawa-test --file kubeconfig-test.yaml

# Cluster PROD
az aks get-credentials --resource-group rg-futurekawa --name aks-futurekawa-prod --file kubeconfig-prod.yaml
```

Uploader ces fichiers dans Jenkins comme "Secret file".

### B. Comptes Jenkins pour l'approbation

Aller dans **Gérer Jenkins → Gérer les utilisateurs**

Créer (ou vérifier) les utilisateurs avec les IDs exacts :
- `admin`
- `superviseur`

Seuls ces deux comptes peuvent cliquer sur le bouton de validation en production.

### C. Prérequis sur les clusters AKS (une fois par environnement)

Exécuter les commandes suivantes **pour TEST** puis **pour PROD** (en changeant `futurekawa-test` → `futurekawa-prod`) :

```bash
# 1. Namespace
kubectl create namespace futurekawa-test

# 2. Secret — credentials base de données + JWT
kubectl create secret generic futurekawa-secrets -n futurekawa-test \
  --from-literal=db-user='futurekawa' \
  --from-literal=db-password='MotDePasseFort123!' \
  --from-literal=jwt-secret='votre-secret-jwt-minimum-32-caracteres-ici'

# 3. ConfigMap — URLs des bases Azure Database for PostgreSQL
#    Remplacer <serveur-xxx> par les noms réels des serveurs Azure créés
kubectl create configmap futurekawa-config -n futurekawa-test \
  --from-literal=db-url-identite='jdbc:postgresql://<serveur-identite>.postgres.database.azure.com:5432/identite?sslmode=require' \
  --from-literal=db-url-bresil='jdbc:postgresql://<serveur-bresil>.postgres.database.azure.com:5432/futurekawa?sslmode=require' \
  --from-literal=db-url-equateur='jdbc:postgresql://<serveur-equateur>.postgres.database.azure.com:5432/futurekawa?sslmode=require' \
  --from-literal=db-url-colombie='jdbc:postgresql://<serveur-colombie>.postgres.database.azure.com:5432/futurekawa?sslmode=require'
```

> Ces ressources (Secret + ConfigMap) sont créées une seule fois. Le pipeline ne les touche pas : il déploie uniquement les applications.

### D. Ajouter le webhook GitHub → Jenkins

Pour que Jenkins démarre automatiquement dès qu'un push arrive sur `main` :

1. Sur GitHub → **Settings → Webhooks → Add webhook**
2. Payload URL : `http://<adresse-jenkins>:8080/github-webhook/`
3. Content type : `application/json`
4. Events : cocher **"Just the push event"**
5. Sauvegarder

---

## Résumé rapide

```
Développeur :  git push origin main (via PR mergée)
                     ↓
Jenkins :      Tests → Build → Push Docker Hub → Deploy TEST
                     ↓
Superviseur :  Vérifier TEST → Cliquer "Déployer en production"
                     ↓
Jenkins :      Deploy PRODUCTION  ✅
```

---

## En cas de problème

| Problème | Où regarder |
|---|---|
| Tests échoués | Logs de l'étape "Tests" dans Jenkins → onglet Test Results |
| Build Docker échoué | Logs de l'étape "Build images Docker" |
| Push Docker Hub échoué | Vérifier le credential `docker-hub-credentials` dans Jenkins |
| Déploiement AKS échoué | `kubectl describe pod <nom-pod> -n futurekawa-test` |
| Pod en `CrashLoopBackOff` | `kubectl logs <nom-pod> -n futurekawa-test` |
| Secret ou ConfigMap manquant | `kubectl get secret,configmap -n futurekawa-test` |
| Timeout approbation (24h) | Relancer le pipeline manuellement depuis Jenkins |
