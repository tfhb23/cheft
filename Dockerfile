# Cheft: App bauen und Server starten (liefert dist/ aus und betreibt die Räume)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev && npm install --no-save tsx@4
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./
EXPOSE 8080
CMD ["npx", "tsx", "server/index.ts"]
