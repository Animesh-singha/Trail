async function triggerFakeAlert() {
  const alertPayload = {
    "receiver": "ai-analyzer",
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "PostgresHighConnections",
          "severity": "critical",
          "instance": "local-sandbox-db",
          "job": "postgres"
        },
        "annotations": {
          "summary": "Database connection pool exhausted.",
          "description": "PostgreSQL database has 102 active connections, exceeding the warning threshold of 100."
        },
        "startsAt": new Date().toISOString()
      }
    ],
    "groupLabels": { "alertname": "PostgresHighConnections" },
    "commonLabels": { "severity": "critical" },
    "commonAnnotations": {}
  };

  try {
    console.log("🔥 Firing dummy alert to the AI Analyzer Webhook (http://localhost:3101)...");
    
    const response = await fetch('http://localhost:3101/v1/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertPayload)
    });

    if (response.ok) {
      console.log("✅ Alert sent successfully! Status:", response.status);
      console.log("⏳ Wait about 5-10 seconds for the AI to process it and see it appear in the dashboard!");
    } else {
      console.error("❌ Failed to send alert. Status:", response.status);
    }
  } catch (err) {
    console.error("❌ Network error. Is the ai-analyzer service running on port 3101?");
    console.error(err);
  }
}

triggerFakeAlert();
