# ============================================================
#  backend-pays — image Docker (build Maven multi-étapes)
#  À placer à la racine du module backend-pays/
# ============================================================

# ---- Étape 1 : build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# Cache des dépendances : on copie d'abord le pom
COPY pom.xml .
RUN mvn -q -e -B dependency:go-offline
# Puis le code source
COPY src ./src
RUN mvn -q -B -DskipTests package

# ---- Étape 2 : runtime ----
FROM eclipse-temurin:21-jre
WORKDIR /app
# Récupère le jar exécutable produit par Spring Boot
COPY --from=build /app/target/*.jar app.jar
# Le port réel est défini par le profil Spring (8080/8081/8082)
EXPOSE 8080 8081 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
