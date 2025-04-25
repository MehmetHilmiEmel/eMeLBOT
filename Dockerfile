# 1. Build aşaması
FROM node:18 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . ./

RUN npm run build

# 2. Serve aşaması (build dosyalarını Nginx ile sunarız)
FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html

# React Router için fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
