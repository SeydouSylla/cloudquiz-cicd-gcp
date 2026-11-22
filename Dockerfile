# Image de production de CloudQuiz
# Base légère : Node.js 22 sur Alpine Linux
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# 1) D'abord les dépendances : cette couche reste en cache tant que package.json ne change pas
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 2) Ensuite le code de l'application
COPY src ./src
COPY public ./public

# Informations de version, fournies par Cloud Build au moment du build
ARG COMMIT_SHA=local
ARG BUILD_TIME=
ENV COMMIT_SHA=$COMMIT_SHA \
    BUILD_TIME=$BUILD_TIME

# Sécurité : on n'exécute pas l'application en root (l'utilisateur "node" existe dans l'image)
USER node

# Cloud Run envoie le trafic sur le port 8080
EXPOSE 8080
CMD ["node", "src/server.js"]
