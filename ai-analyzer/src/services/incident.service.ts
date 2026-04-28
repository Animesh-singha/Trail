import { gatherContext } from './correlation.service';
import { generateRootCause } from './ai.service';
import { saveIncident } from './db.service';
import { sendNotification } from './notify.service';
import { detectSecurityPatterns } from './security.service';
import { executeRemediation } from './automation.service';
import { eventHub, EVENTS } from '../utils/events';

export const processIncident = async (alerts: any[], logger: any) => {
  for (const alert of alerts) {
    try {
      logger.info(`Processing alert: ${alert.labels?.alertname}`);
      
      const instance = alert.labels?.instance;
      const severity = alert.labels?.severity || 'info';
      
      // 1. Correlate Context (Logs + Metrics)
      logger.info(`Gathering context for instance: ${instance}`);
      const context = await gatherContext(instance);

      // 1.5 Security Pattern Detection (SIEM)
      const logsArray = context.logsContext.split('\n');
      const securityAlert = detectSecurityPatterns(logsArray);
      
      if (securityAlert) {
         logger.warn(`SECURITY PATTERN DETECTED: ${securityAlert.pattern}`);
         // Enrich alert data for AI
         alert.labels.security_threat = securityAlert.pattern;
         alert.annotations.security_description = securityAlert.description;
      }

      // 2. AI Root Cause Analysis
      let aiResponse: any = { 
        summary: 'Awaiting AI Analysis...', 
        root_cause: 'The AI Analyzer is currently processing this incident or is temporarily unreachable.',
        suggested_actions: ['Manual investigation required.'],
        confidence: 0,
        severity: severity.toUpperCase()
      };

      try {
        logger.info(`Sending alert + context to AI Analyzer...`);
        aiResponse = await generateRootCause(alert, context);
      } catch (aiErr) {
        logger.error('AI Analysis Failed, continuing with manual entry', aiErr);
      }

      // 3. Construct Incident Payload
      const incidentData = {
        service: instance || 'unknown_target',
        severity: aiResponse.severity || severity.toUpperCase(), 
        alert_name: alert.labels?.alertname || 'Unknown Alert',
        summary: aiResponse.summary,
        root_cause: aiResponse.root_cause,
        suggested_fix: aiResponse.suggested_actions?.[0] || 'Manual investigation required.',
        confidence: aiResponse.confidence || 0,
        status: 'OPEN'
      };

      // 3.5 Autonomous Remediation Safety Layer (Phase 2 Hardening)
      if (incidentData.severity === 'CRITICAL' && incidentData.confidence > 80) {
         logger.info(`AI suggests remediation for ${incidentData.alert_name}. Marking as PENDING_APPROVAL.`);
         incidentData.status = 'PENDING_APPROVAL';
      }

      // 4. Save to Database
      logger.info(`Saving incident to database...`);
      const savedIncident = await saveIncident(incidentData);
      
      // Emit for real-time dashboard update
      eventHub.emit('broadcast', { type: EVENTS.INCIDENT_NEW, payload: savedIncident });

      // 5. Notify Admins
      logger.info(`Sending notifications...`);
      await sendNotification(savedIncident);

      logger.info(`Successfully processed incident ID: ${savedIncident?.id}`);

    } catch (error) {
      logger.error('Failed to process individual alert', error);
    }
  }
};
