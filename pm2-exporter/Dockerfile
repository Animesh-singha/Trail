FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Install the Prometheus Exporter locally
RUN npm install pm2-prometheus-exporter

# The exporter runs on port 9209 by default
EXPOSE 9209

# Use npx to automatically find and run the binary
CMD ["npx", "pm2-prometheus-exporter"]
