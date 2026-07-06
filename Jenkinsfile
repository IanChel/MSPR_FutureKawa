// =============================================================================
//  FutureKawa — Pipeline CI/CD (Jenkins déclaratif)
// -----------------------------------------------------------------------------
//  CI  : tests back-end pays + central + front-end, packaging, build images
//  CD  : push Docker Hub → déploiement TEST (Azure AKS)
//        → approbation superviseur → déploiement PRODUCTION (Azure AKS)
//
//  Credentials Jenkins à configurer (Gérer Jenkins → Credentials) :
//    docker-hub-credentials   Type: Username/Password  (compte Docker Hub)
//    kubeconfig-aks-test      Type: Secret file        (kubeconfig cluster TEST)
//    kubeconfig-aks-prod      Type: Secret file        (kubeconfig cluster PROD)
//
//  Prérequis sur chaque cluster AKS (à faire UNE SEULE FOIS par env) :
//    Voir les instructions dans k8s/futurekawa.yaml
// =============================================================================

pipeline {
    agent any

    options {
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        // Jenkins lie automatiquement DOCKER_CREDS_USR et DOCKER_CREDS_PSW
        DOCKER_CREDS = credentials('docker-hub-credentials')
    }

    stages {

        // ── INTÉGRATION CONTINUE ──────────────────────────────────────────────

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Tests — back-end pays') {
            steps {
                dir('backend-pays') {
                    sh 'chmod +x mvnw'
                    sh './mvnw -B test'
                }
            }
            post {
                always {
                    junit testResults: 'backend-pays/target/surefire-reports/*.xml',
                          allowEmptyResults: true
                }
            }
        }

        stage('Tests — back-end central') {
            steps {
                dir('backend-central') {
                    sh 'chmod +x mvnw'
                    sh './mvnw -B test'
                }
            }
            post {
                always {
                    junit testResults: 'backend-central/target/surefire-reports/*.xml',
                          allowEmptyResults: true
                }
            }
        }

        stage('Tests — front-end') {
            steps {
                dir('front-end') {
                    sh 'npm ci'
                    sh 'npm test'
                }
            }
        }

        stage('Packaging') {
            steps {
                dir('backend-pays')    { sh './mvnw -B -DskipTests package' }
                dir('backend-central') { sh './mvnw -B -DskipTests package' }
                dir('front-end')       { sh 'npm run build' }
            }
        }

        stage('Build images Docker') {
            steps {
                // Images construites directement avec le tag Docker Hub final
                sh 'docker build -f backend-pays/Dockerfile.ci    -t $DOCKER_CREDS_USR/futurekawa-backend-pays:$BUILD_NUMBER    -t $DOCKER_CREDS_USR/futurekawa-backend-pays:latest    backend-pays'
                sh 'docker build -f backend-central/Dockerfile.ci -t $DOCKER_CREDS_USR/futurekawa-backend-central:$BUILD_NUMBER -t $DOCKER_CREDS_USR/futurekawa-backend-central:latest backend-central'
                sh "docker image ls --filter=reference='$DOCKER_CREDS_USR/futurekawa-*'"
            }
        }

        // ── DÉPLOIEMENT CONTINU (branche main uniquement) ────────────────────

        stage('Push → Docker Hub') {
            when { branch 'main' }
            steps {
                sh 'echo $DOCKER_CREDS_PSW | docker login -u $DOCKER_CREDS_USR --password-stdin'
                sh 'docker push $DOCKER_CREDS_USR/futurekawa-backend-pays:$BUILD_NUMBER'
                sh 'docker push $DOCKER_CREDS_USR/futurekawa-backend-pays:latest'
                sh 'docker push $DOCKER_CREDS_USR/futurekawa-backend-central:$BUILD_NUMBER'
                sh 'docker push $DOCKER_CREDS_USR/futurekawa-backend-central:latest'
            }
            post {
                always { sh 'docker logout' }
            }
        }

        stage('Déploiement TEST — Azure AKS') {
            when { branch 'main' }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig-aks-test', variable: 'KUBECONFIG')]) {
                    sh '''
                        export NAMESPACE=futurekawa-test
                        export IMAGE_TAG=$BUILD_NUMBER
                        export DOCKER_USER=$DOCKER_CREDS_USR
                        envsubst '$NAMESPACE $IMAGE_TAG $DOCKER_USER' < k8s/futurekawa.yaml | kubectl apply -f -
                        echo "--- Attente du déploiement sur TEST ---"
                        kubectl rollout status deployment/fk-central  -n futurekawa-test --timeout=5m
                        kubectl rollout status deployment/fk-pays-br  -n futurekawa-test --timeout=5m
                        kubectl rollout status deployment/fk-pays-ec  -n futurekawa-test --timeout=5m
                        kubectl rollout status deployment/fk-pays-co  -n futurekawa-test --timeout=5m
                        echo "✅ Environnement TEST opérationnel — en attente de validation superviseur."
                    '''
                }
            }
        }

        // Étape bloquante : le superviseur (Jenkins user 'admin' ou 'superviseur')
        // doit cliquer sur "Déployer en production" dans l'interface Jenkins.
        // Sans action, le pipeline s'annule automatiquement après 24 h.
        stage('Approbation superviseur') {
            when { branch 'main' }
            steps {
                timeout(time: 24, unit: 'HOURS') {
                    input(
                        message: 'Les tests sur TEST sont-ils validés ? Déployer en PRODUCTION ?',
                        ok: 'Déployer en production',
                        submitter: 'admin,superviseur',
                        parameters: [
                            text(name: 'NOTE_VALIDATION',
                                 defaultValue: '',
                                 description: 'Commentaire de validation (optionnel)')
                        ]
                    )
                }
            }
        }

        stage('Déploiement PRODUCTION — Azure AKS') {
            when { branch 'main' }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig-aks-prod', variable: 'KUBECONFIG')]) {
                    sh '''
                        export NAMESPACE=futurekawa-prod
                        export IMAGE_TAG=$BUILD_NUMBER
                        export DOCKER_USER=$DOCKER_CREDS_USR
                        envsubst '$NAMESPACE $IMAGE_TAG $DOCKER_USER' < k8s/futurekawa.yaml | kubectl apply -f -
                        echo "--- Attente du déploiement sur PRODUCTION ---"
                        kubectl rollout status deployment/fk-central  -n futurekawa-prod --timeout=10m
                        kubectl rollout status deployment/fk-pays-br  -n futurekawa-prod --timeout=10m
                        kubectl rollout status deployment/fk-pays-ec  -n futurekawa-prod --timeout=10m
                        kubectl rollout status deployment/fk-pays-co  -n futurekawa-prod --timeout=10m
                        echo "✅ PRODUCTION déployée avec succès (build #$BUILD_NUMBER)."
                    '''
                }
            }
        }
    }

    post {
        success {
            archiveArtifacts artifacts: 'backend-pays/target/*.jar, backend-central/target/*.jar, front-end/dist/**',
                             fingerprint: true, allowEmptyArchive: true
            echo '✅ Pipeline CI/CD terminé — production déployée sur Azure AKS.'
        }
        failure {
            echo '❌ Pipeline échoué — voir l\'étape en erreur ci-dessus.'
        }
        aborted {
            echo '⚠️ Pipeline interrompu — approbation refusée ou timeout 24 h dépassé.'
        }
    }
}
