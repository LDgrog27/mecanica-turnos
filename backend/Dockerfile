# Etapa 1: build del proyecto con la imagen oficial de Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copiamos el pom.xml y el src del backend
COPY backend/pom.xml .
COPY backend/src ./src

# 👇 LA SOLUCIÓN: Copiamos tu frontend de la raíz a la carpeta static de Spring Boot
COPY index.html ./src/main/resources/static/
COPY admin ./src/main/resources/static/admin
COPY css ./src/main/resources/static/css
COPY js ./src/main/resources/static/js
COPY img ./src/main/resources/static/img
COPY 404.html contacto.html reserva.html reserva-confirmada.html ./src/main/resources/static/
# (Si te falta alguna carpeta o archivo HTML que uses, agrégalo aquí arriba)

# Compilamos
RUN mvn clean package -DskipTests

# Etapa 2: imagen final, liviana
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]