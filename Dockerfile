# ============================================================================
# humanity.wiki — imagen de producción (Fase B-4 del plan de lanzamiento)
# ============================================================================
# Multi-stage: se compila el frontend (Vite) y el servidor (esbuild) en una
# etapa desechable, y la imagen final solo lleva dist/ + dependencias de
# producción. El servidor en NODE_ENV=production sirve la API y el estático.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
EXPOSE 3000
# Las variables (SQL_*, ANTHROPIC_API_KEY, STRIPE test…) llegan por env_file
# desde docker-compose; nunca se copian dentro de la imagen.
CMD ["node", "dist/server.cjs"]
