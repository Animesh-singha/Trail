FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Install the Prometheus Exporter locally
RUN npm install pm2-prometheus-exporter

# The exporter runs on port 9209 by default
EXPOSE 9209

# Use the shell to find and run the exporter directly
CMD ["sh", "-c", "node $(npm root)/pm2-prometheus-exporter/index.js || node $(npm root)/pm2-prometheus-exporter/bin/pm2-prometheus-exporter"]
