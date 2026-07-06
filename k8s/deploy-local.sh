#!/bin/bash
# =============================================================================
#  PREUVE LOCALE — déploie FutureKawa sur le Kubernetes de Docker Desktop.
# -----------------------------------------------------------------------------
#  Pré-requis : Kubernetes activé dans Docker Desktop (Settings > Kubernetes),
#  et les images locales taguées :
#     docker tag futurekawa/backend-pays:latest    local/futurekawa-backend-pays:1
#     docker tag futurekawa/backend-central:latest local/futurekawa-backend-central:1
#
#  Lancer depuis la racine du dépôt :  bash k8s/deploy-local.sh
# =============================================================================
set -e

NS=futurekawa-test
export NAMESPACE=$NS
export IMAGE_TAG=1
export DOCKER_USER=local

echo "==> 1. Namespace"
kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f -

echo "==> 2. Dépendances locales (Postgres + Secret + ConfigMap)"
kubectl apply -f k8s/local-deps.yaml

echo "==> 3. Attente que Postgres soit prêt"
kubectl rollout status deployment/fk-postgres -n "$NS" --timeout=120s

echo "==> 4. Application du manifest principal (images locales)"
envsubst '$NAMESPACE $IMAGE_TAG $DOCKER_USER' < k8s/futurekawa.yaml | kubectl apply -f -

echo "==> 5. État du déploiement"
kubectl get pods -n "$NS" -o wide
echo ""
echo "Suivez la montée en route avec :  kubectl get pods -n $NS -w"
