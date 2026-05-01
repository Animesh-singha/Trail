FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Copy dependency definition
COPY package.json ./

# Install dependencies locally in /app/node_modules
RUN npm install

# Set environment for PM2 access
ENV PM2_HOME=/root/.pm2

EXPOSE 9209

# Start the exporter using the npm script
CMD ["npm", "start"]
