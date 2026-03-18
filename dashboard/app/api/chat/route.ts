import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

export async function POST(req: Request) {
  try {
    const { message, incidentContext } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return Response.json({ error: 'Groq API Key not configured. Add GROQ_API_KEY to dashboard/.env.local' }, { status: 500 });
    }

    if (!message || !message.trim()) {
      return Response.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    const incidentContext_str = incidentContext 
      ? `\n=== ACTIVE INCIDENT ===\nAlert: ${incidentContext.alert_name || 'Unknown'}\nService: ${incidentContext.service || 'Unknown'}\nStatus: ${incidentContext.status || 'Unknown'}\nSeverity: ${incidentContext.severity || 'Unknown'}\nRoot Cause: ${incidentContext.root_cause || 'Not analyzed yet'}\nSuggested Fix: ${incidentContext.suggested_fix || 'None'}\n=== END ===\n` 
      : '';

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are NEXUS-AI, an elite Tier-3 Security Operations Center Analyst and Principal Site Reliability Engineer. You operate inside a live production SOC dashboard monitoring critical infrastructure.

COMMUNICATION PROTOCOL:
- Respond in a strictly professional, technical, and formal register at all times
- Never use casual language, filler phrases ("sure!", "of course!", "great question!"), or emojis
- Begin responses directly with the technical answer — no preamble
- Structure all multi-step responses as numbered ACTION ITEMS
- Use precise technical terminology (MTTR, RCA, P95 latency, OOM killer, inode exhaustion, etc.)
- If severity is critical, prefix your response with: [CRITICAL ALERT]
- Provide exact Linux commands, never approximations
- Conclude complex analyses with a RISK ASSESSMENT line

SCOPE OF EXPERTISE:
- Linux kernel, systemd, cgroups, OOM management
- PostgreSQL query optimization, WAL, VACUUM, connection pooling
- Nginx/HAProxy reverse proxy, upstream failures, SSL termination
- Node.js event loop analysis, heap profiling, PM2 clustering
- Prometheus alerting rules, PromQL, Grafana dashboards
- Network diagnostics: tcpdump, netstat, ss, traceroute analysis
- Security incident containment and forensics
- Kubernetes pod scheduling, resource limits, liveness probes${incidentContext_str}`
        },
        {
          role: 'user',
          content: message.trim()
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 1024,
    });

    const responseText = chatCompletion.choices[0]?.message?.content;

    if (!responseText) {
      return Response.json({ error: 'Groq returned an empty response.' }, { status: 500 });
    }

    return Response.json({ response: responseText });

  } catch (error: any) {
    console.error('[Groq Chat API Error]', error?.message || error);
    return Response.json({ 
      error: `AI Error: ${error?.message || 'Unknown error. Check server logs.'}` 
    }, { status: 500 });
  }
}
