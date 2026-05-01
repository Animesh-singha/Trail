FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Install the Prometheus Exporter locally
RUN npm install pm2-prometheus-exporter

# The exporter runs on port 9209 by default
EXPOSE 9209

# This script finds ANY javascript file in the package and tries to run the right one
CMD ["sh", "-c", "node $(find node_modules/pm2-prometheus-exporter -name 'index.js' | head -n 1) || node $(find node_modules/pm2-prometheus-exporter -name 'main.js' | head -n 1) || npx pm2-prometheus-exporter"]
