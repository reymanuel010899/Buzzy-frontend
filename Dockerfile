# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM clouder-frontend-runtime

# Copia build al directorio público de nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Inyectamos las variables de entorno al iniciar el contenedor (Runtime) 
# escribiendo un pequeño script JS para que el navegador las lea.
CMD ["sh", "-c", "echo \"window.__RUNTIME_CONFIG__ = { NEXT_PUBLIC_BACKEND_URL: '${NEXT_PUBLIC_BACKEND_URL}' };\" > /usr/share/nginx/html/env-config.js && nginx -g 'daemon off;'"]
