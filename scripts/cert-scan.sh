#!/bin/bash

# Directory for Prometheus textfile collector (Host side)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$SCRIPT_DIR/../monitoring/metrics"
mkdir -p "$TARGET_DIR"

METRICS_FILE="$TARGET_DIR/certs.prom"
echo "# HELP ssl_certificate_expiry_days Days until SSL certificate expires" > $METRICS_FILE
echo "# TYPE ssl_certificate_expiry_days gauge" >> $METRICS_FILE

# Use certbot to get certificate info
# We parse the output to get Domain and Expiry
while read -r line; do
    if [[ $line == *"Certificate Name:"* ]]; then
        DOMAIN=$(echo $line | awk '{print $3}')
    fi
    if [[ $line == *"Expiry Date:"* ]]; then
        EXPIRY_DATE=$(echo $line | cut -d' ' -f3-6)
        # Convert expiry to seconds
        EXPIRY_SECONDS=$(date -d "$EXPIRY_DATE" +%s)
        CURRENT_SECONDS=$(date +%s)
        DIFF=$(( (EXPIRY_SECONDS - CURRENT_SECONDS) / 86400 ))
        
        # Write to metrics file
        echo "ssl_certificate_expiry_days{domain=\"$DOMAIN\"} $DIFF" >> $METRICS_FILE
    fi
done < <(certbot certificates 2>/dev/null)

echo "Certificates updated at $(date)"
