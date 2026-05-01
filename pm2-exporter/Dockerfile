FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Copy ALL files from the local pm2-exporter folder into the container
COPY . .

# Install dependencies locally
RUN npm install

# Set environment for PM2 access
ENV PM2_HOME=/root/.pm2

EXPOSE 9209

# Start the exporter using our index.js
CMD ["npm", "start"]
