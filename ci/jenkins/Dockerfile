# =============================================================================
#  Image Jenkins « prête à l'emploi » pour démontrer la CI de FutureKawa.
#  Basée sur Jenkins LTS (JDK 21) + Node 20 + CLI Docker, avec les plugins
#  nécessaires et le job de pipeline déjà configuré (Jenkinsfile lu du dépôt).
# =============================================================================
FROM jenkins/jenkins:lts-jdk21

USER root

# Node.js 20 (tests + build front), CLI Docker (build d'images dans le pipeline)
# et gosu (abaissement de privilèges au démarrage). Git est déjà présent.
RUN apt-get update \
 && apt-get install -y curl ca-certificates gnupg gosu \
 && install -m 0755 -d /etc/apt/keyrings \
 # --- dépôt NodeSource ---
 && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
 && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
 # --- dépôt Docker (CLI uniquement) ---
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && chmod a+r /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" > /etc/apt/sources.list.d/docker.list \
 && apt-get update && apt-get install -y nodejs docker-ce-cli \
 && rm -rf /var/lib/apt/lists/*

# Le dépôt est monté en volume (propriétaire = hôte) : on le déclare « sûr »
# pour éviter l'erreur Git « dubious ownership » lors du checkout.
RUN git config --system --add safe.directory '*'

# Plugins Jenkins (pipeline, git, publication JUnit, vue par étapes)
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Job de pipeline pré-créé (copié dans JENKINS_HOME au premier démarrage)
COPY jobs/FutureKawa-CI/config.xml /usr/share/jenkins/ref/jobs/FutureKawa-CI/config.xml

# Entrypoint : aligne le groupe du socket Docker puis démarre Jenkins en
# utilisateur « jenkins » (voir docker-entrypoint.sh).
COPY docker-entrypoint.sh /usr/local/bin/fk-entrypoint.sh
RUN chmod +x /usr/local/bin/fk-entrypoint.sh

# Démarrage direct (pas d'assistant de configuration) pour une démo simple.
# ALLOW_LOCAL_CHECKOUT : autorise le checkout depuis le dépôt monté (file:///repo).
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Dhudson.plugins.git.GitSCM.ALLOW_LOCAL_CHECKOUT=true"

# On reste root pour l'entrypoint (ajustement du groupe Docker) ; gosu abaisse
# ensuite les privilèges vers « jenkins ».
ENTRYPOINT ["/usr/local/bin/fk-entrypoint.sh"]
