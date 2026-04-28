FROM node:18-alpine

# Install PM2 and the Prometheus Exporter
RUN npm install -g pm2 pm2-prometheus-exporter

# The exporter runs on port 9209 by default
EXPOSE 9209

# Command to run the exporter
CMD ["npx", "-y", "pm2-prometheus-exporter"]
