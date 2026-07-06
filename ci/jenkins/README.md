# Intégration continue — Jenkins

Ce dossier fournit un environnement **Jenkins prêt à l'emploi** pour exécuter le
pipeline d'intégration continue de FutureKawa (défini dans le [`Jenkinsfile`](../../Jenkinsfile)
à la racine du dépôt) et obtenir une **preuve d'exécution**.

## Ce que fait le pipeline

| Étape | Action |
|---|---|
| Checkout | Récupère le code depuis le dépôt Git |
| Tests — back-end pays | `./mvnw -B test` (16 tests) + publication JUnit |
| Tests — back-end central | `./mvnw -B test` (6 tests) + publication JUnit |
| Tests — front-end | `npm ci` puis `npm test` (Vitest, 9 tests) |
| Packaging | Construit les JAR des back-ends et le build du front |
| Images Docker | `docker build` des images `futurekawa/backend-pays` et `futurekawa/backend-central` |
| Archivage | Publie les artefacts (`*.jar`, `front-end/dist/`) |

L'image Jenkins fournie embarque **JDK 21**, **Node 20**, **le CLI Docker**, Git
et les plugins nécessaires ; le job `FutureKawa-CI` est **déjà créé** au démarrage.

## Pré-requis
- Docker Desktop démarré.
- Le `Jenkinsfile` doit être committé sur la branche lue par le job (`sarah`).
- Le **socket Docker** est monté dans le conteneur Jenkins (voir la commande
  `docker run` ci-dessous) : c'est lui qui permet l'étape « Images Docker ».

## Lancer la démo (pas à pas)

Depuis la racine du dépôt :

```powershell
# 1. Construire l'image Jenkins (la première fois, ~2-3 min)
docker build -t futurekawa-jenkins ci/jenkins

# 2. Démarrer Jenkins (dépôt monté en lecture seule + socket Docker pour
#    l'étape « Images Docker »)
docker run -d --name fk-jenkins -p 18080:8080 `
  -v "C:\Users\ian chel\Documents\GitHub\FutureKawa:/repo:ro" `
  -v //var/run/docker.sock:/var/run/docker.sock `
  futurekawa-jenkins
```

> Adaptez le chemin du premier `-v` à l'emplacement du dépôt sur votre machine.
> Le second `-v` (socket Docker) est requis pour construire les images dans le
> pipeline. Sous Docker Desktop (Windows), gardez bien le double slash `//var/...`.

3. Ouvrez **http://localhost:18080** (aucune authentification — assistant désactivé pour la démo).
4. Cliquez sur le job **FutureKawa-CI** → **Lancer un build** (« Build Now »).
5. Suivez la **Stage View** : toutes les étapes passent au vert.
6. Ouvrez **Console Output** pour la preuve détaillée (résultats de tests, `Finished: SUCCESS`).
   → c'est cette page (ou la Stage View verte) que l'on capture en **preuve d'exécution**.

> ⏱️ Le **premier build** télécharge Maven et toutes les dépendances : comptez
> quelques minutes. Les suivants sont bien plus rapides.

## Arrêter et nettoyer

```powershell
docker rm -f fk-jenkins        # arrête et supprime le conteneur Jenkins
# (l'image futurekawa-jenkins reste disponible pour relancer instantanément)
```

## Preuve d'exécution déjà capturée

Un journal complet d'un build réussi est conservé dans
[`docs/ci/preuve-execution-jenkins.txt`](../../docs/ci/preuve-execution-jenkins.txt)
(`22 tests back-end passés, build front OK, Finished: SUCCESS`).

## Notes techniques
- Le job lit le dépôt local monté (`file:///repo`) ; le flag
  `hudson.plugins.git.GitSCM.ALLOW_LOCAL_CHECKOUT` est activé pour cela.
- En contexte réel, on remplacerait `file:///repo` par l'URL du dépôt distant
  (GitHub) et on déclencherait le pipeline via un webhook.
- Le packaging produit des artefacts (JAR + build front) ; l'étape suivante
  construit les **images Docker** des back-ends via le socket monté.
- ⚠️ **Sécurité** : monter `/var/run/docker.sock` dans Jenkins donne au pipeline
  un accès quasi-équivalent à root sur l'hôte. Acceptable pour une démo locale ;
  en production on isolerait le build d'images (agent dédié, BuildKit/Kaniko sans
  démon, ou registre + runner éphémère). L'entrypoint
  ([`docker-entrypoint.sh`](docker-entrypoint.sh)) aligne le groupe du socket
  pour que l'utilisateur non-root `jenkins` puisse l'utiliser sans tourner en root.
- Les images produites (`futurekawa/backend-pays:latest`,
  `futurekawa/backend-central:latest`) restent disponibles dans le démon Docker
  de l'hôte après le build (`docker image ls "futurekawa/*"`).
