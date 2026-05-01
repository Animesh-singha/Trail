FROM node:18-bullseye-slim

# Install pm2-metrics globally
RUN npm install -g pm2-metrics

# Set environment for PM2 access
ENV PM2_HOME=/root/.pm2

EXPOSE 9209

# Use the absolute system path to start the program
CMD ["/usr/local/bin/pm2-metrics", "9209"]
