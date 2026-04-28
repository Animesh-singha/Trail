FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build step if needed (e.g., TypeScript)
# RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "dev"]
