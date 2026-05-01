FROM node:18-bullseye-slim

# Install the Prometheus Exporter
RUN npm install -g pm2-prometheus-exporter

# The exporter runs on port 9209 by default
EXPOSE 9209

# Command to run the exporter
CMD ["pm2-prometheus-exporter"]
