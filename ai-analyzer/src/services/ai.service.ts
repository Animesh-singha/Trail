import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const AI_PROVIDER_API_KEY = process.env.AI_PROVIDER_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gemini-1.5-flash'; 

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: AI_PROVIDER_API_KEY });

export const generateRootCause = async (alertData: any, context: { metricsContext: string, logsContext: string }) => {
  const systemInstruction = `You are a Senior Site Reliability Engineer and Infrastructure Architect.
  Your goal is to provide 'Actionable Clarity' to operators.
  
  Provide a JSON response with these EXACT fields:
  1. "severity": (string) LOW, MEDIUM, HIGH, CRITICAL.
  2. "summary": (string) Executive summary.
  3. "root_cause": (string) Technical explanation.
  4. "user_impact_percent": (number) Heuristic estimate of user population affected (0-100).
  5. "downstream_nodes_affected": (number) Count of nodes impacted by this failure.
  6. "suggested_actions": (array of strings) Targeted remediation steps.
  7. "confidence": (number) 0-100.
  
  Think about 'Impact Depth'. If an APP node is down, how many DOMAIN nodes point to it?
  Do not include markdown.`;

  const userPrompt = `
  Alert Details: ${JSON.stringify(alertData.labels)}
  Description: ${alertData.annotations?.description}
  
  Metrics Context:
  ${context.metricsContext}
  
  Logs Context:
  ${context.logsContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const content = response.text;
    
    try {
      if (content) {
         return JSON.parse(content);
      } else {
          throw new Error("Empty response from Gemini");
      }
    } catch (e) {
      console.error("AI response not strictly JSON. Fallback applying.", content);
      return {
        summary: "Autonomous analysis partially degraded.",
        root_cause: content,
        user_impact_percent: 10,
        suggested_actions: ["Manually review AI raw output", "Check system logs"]
      };
    }
  } catch (err: any) {
    throw new Error('AI Provider Unreachable');
  }
};
