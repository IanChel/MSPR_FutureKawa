#!/bin/bash
# =============================================================================
#  Entrypoint Jenkins — alignement du groupe du socket Docker.
# -----------------------------------------------------------------------------
#  Le pipeline construit des images Docker via le socket monté
#  (/var/run/docker.sock). Ce socket appartient à un groupe dont le GID dépend
#  de l'hôte : on crée localement un groupe avec ce même GID et on y ajoute
#  l'utilisateur « jenkins », puis on lâche les privilèges root via gosu.
# =============================================================================
set -e

SOCK=/var/run/docker.sock
if [ -S "$SOCK" ]; then
    DOCKER_GID="$(stat -c '%g' "$SOCK")"
    if ! getent group "$DOCKER_GID" >/dev/null 2>&1; then
        groupadd -g "$DOCKER_GID" dockerhost
    fi
    GROUP_NAME="$(getent group "$DOCKER_GID" | cut -d: -f1)"
    usermod -aG "$GROUP_NAME" jenkins
else
    echo "⚠️  Socket Docker absent ($SOCK) : l'étape « Images Docker » échouera." >&2
    echo "   Relancez le conteneur avec -v //var/run/docker.sock:/var/run/docker.sock" >&2
fi

# Démarrage de Jenkins en tant qu'utilisateur « jenkins » (init = tini).
exec gosu jenkins /usr/bin/tini -- /usr/local/bin/jenkins.sh
