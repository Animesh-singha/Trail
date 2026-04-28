FROM node:18-alpine

# Install PM2 and the Prometheus Exporter
RUN npm install -g pm2 pm2-prometheus-exporter

# The exporter runs on port 9209 by default
EXPOSE 9209

# Command to run the exporter
# We use 'pm2-prometheus-exporter' directly as a binary
CMD ["pm2-prometheus-exporter"]
