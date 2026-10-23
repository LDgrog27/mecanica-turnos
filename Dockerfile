# Etapa 1: build con Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Backend
COPY backend/pom.xml .
COPY backend/src ./src

# Frontend estático dentro de Spring Boot
COPY index.html 404.html contacto.html reserva.html reserva-confirmada.html ./src/main/resources/static/
COPY admin ./src/main/resources/static/admin
COPY css ./src/main/resources/static/css
COPY js ./src/main/resources/static/js
COPY img ./src/main/resources/static/img

RUN mvn -B clean package -DskipTests

# Etapa 2: imagen final liviana
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Memoria ajustada al plan gratis (512 MB) y zona horaria del taller
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+UseSerialGC" \
    TZ=America/Mexico_City

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]