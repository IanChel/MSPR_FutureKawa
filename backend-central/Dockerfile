# ============================================================
#  backend-central — image Docker (build Maven multi-étapes)
#  À placer à la racine du module backend-central/
# ============================================================

# ---- Étape 1 : build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -e -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# ---- Étape 2 : runtime ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8090
ENTRYPOINT ["java", "-jar", "app.jar"]
