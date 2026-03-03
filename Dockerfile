# Usar una imagen base de Node.js
FROM node:20-slim

# Instalar dependencias necesarias para SQLite y herramientas de compilación
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar el frontend (React)
RUN npm run build

# Exponer el puerto que usa la app
EXPOSE 3000

# Definir variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando para arrancar la aplicación
# Usamos npx tsx para ejecutar el archivo .ts directamente
CMD ["npx", "tsx", "server.ts"]
