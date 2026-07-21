# Backend image
FROM eclipse-temurin:21-jdk-alpine AS backend-build
WORKDIR /build
COPY backend/pom.xml .
COPY backend/src ./src
COPY backend/mvnw .
COPY backend/.mvn ./.mvn
RUN ./mvnw -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS backend
LABEL app="sale-crm-backend"
WORKDIR /app
COPY --from=backend-build /build/target/sale-crm-backend.jar app.jar
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseG1GC"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

# Frontend image
FROM node:22-alpine AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ .
RUN npm run build

FROM node:22-alpine AS frontend
WORKDIR /app
COPY --from=frontend-build /build/.next/standalone ./
COPY --from=frontend-build /build/.next/static ./.next/static
COPY --from=frontend-build /build/public ./public
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
