/**
 * PagerDuty Integration Configuration
 *
 * Configures PagerDuty alerts for P1 (critical) and P2 (high) issues.
 * PagerDuty will automatically escalate issues based on team schedules.
 *
 * Setup Instructions:
 * 1. Go to https://pagerduty.com and create an account
 * 2. Create a service called "Imobi API"
 * 3. Create an integration for "Events API v2"
 * 4. Copy the integration key and set PAGERDUTY_INTEGRATION_KEY
 * 5. Configure escalation policy with on-call teams
 */

import axios from 'axios';
import * as os from 'os';

export interface PagerDutyAlertPayload {
  routing_key: string;
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  dedup_key?: string;
  payload: {
    summary: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    source: string;
    custom_details?: Record<string, any>;
  };
  links?: Array<{
    href: string;
    text: string;
  }>;
  client?: string;
  client_url?: string;
}

export class PagerDutyIntegration {
  private readonly integrationKey: string;
  private readonly apiEndpoint = 'https://events.pagerduty.com/v2/enqueue';
  private readonly isProd: boolean;

  constructor() {
    this.integrationKey = os.getenv('PAGERDUTY_INTEGRATION_KEY') || '';
    this.isProd = os.getenv('NODE_ENV') === 'production';
  }

  /**
   * Send alert to PagerDuty
   */
  async sendAlert(alert: {
    severity: 'critical' | 'error' | 'warning' | 'info';
    title: string;
    description: string;
    details?: Record<string, any>;
    runbookUrl?: string;
  }): Promise<void> {
    if (!this.integrationKey) {
      console.warn('PagerDuty integration key not configured');
      return;
    }

    // Don't send alerts in non-production environments unless explicitly enabled
    if (!this.isProd && os.getenv('PAGERDUTY_SEND_DEV_ALERTS') !== 'true') {
      console.log(`[DEV] Would send PagerDuty alert: ${alert.title}`);
      return;
    }

    const payload: PagerDutyAlertPayload = {
      routing_key: this.integrationKey,
      event_action: 'trigger',
      dedup_key: `imobi-${alert.title.toLowerCase().replace(/\s+/g, '-')}`,
      payload: {
        summary: alert.title,
        severity: alert.severity,
        source: `imobi-api-${os.getenv('SENTRY_SERVER_NAME') || 'unknown'}`,
        custom_details: {
          environment: os.getenv('NODE_ENV') || 'unknown',
          timestamp: new Date().toISOString(),
          ...alert.details,
        },
      },
      client: 'Imobi API Monitoring',
      client_url: os.getenv('GRAFANA_DASHBOARD_URL') || undefined,
    };

    if (alert.runbookUrl) {
      payload.links = [
        {
          href: alert.runbookUrl,
          text: 'Runbook',
        },
      ];
    }

    try {
      await axios.post(this.apiEndpoint, payload);
      console.log(`[PagerDuty] Alert sent: ${alert.title}`);
    } catch (error) {
      console.error('[PagerDuty] Failed to send alert:', error);
    }
  }

  /**
   * Acknowledge an alert (silence notifications temporarily)
   */
  async acknowledgeAlert(dedupKey: string): Promise<void> {
    if (!this.integrationKey) return;

    const payload: PagerDutyAlertPayload = {
      routing_key: this.integrationKey,
      event_action: 'acknowledge',
      dedup_key: dedupKey,
      payload: {
        summary: `Alert acknowledged: ${dedupKey}`,
        severity: 'info',
        source: 'Imobi API',
      },
    };

    try {
      await axios.post(this.apiEndpoint, payload);
      console.log(`[PagerDuty] Alert acknowledged: ${dedupKey}`);
    } catch (error) {
      console.error('[PagerDuty] Failed to acknowledge alert:', error);
    }
  }

  /**
   * Resolve an alert (mark as resolved)
   */
  async resolveAlert(dedupKey: string): Promise<void> {
    if (!this.integrationKey) return;

    const payload: PagerDutyAlertPayload = {
      routing_key: this.integrationKey,
      event_action: 'resolve',
      dedup_key: dedupKey,
      payload: {
        summary: `Alert resolved: ${dedupKey}`,
        severity: 'info',
        source: 'Imobi API',
      },
    };

    try {
      await axios.post(this.apiEndpoint, payload);
      console.log(`[PagerDuty] Alert resolved: ${dedupKey}`);
    } catch (error) {
      console.error('[PagerDuty] Failed to resolve alert:', error);
    }
  }
}

/**
 * Common P1 and P2 alert templates
 */
export const AlertTemplates = {
  apiDown: {
    severity: 'critical' as const,
    title: 'API is Down',
    description: 'The Imobi API is not responding to health checks',
    runbookUrl: 'https://wiki.imobi.com/runbooks/api-down',
  },

  databaseError: {
    severity: 'critical' as const,
    title: 'Database Connection Failed',
    description: 'Cannot connect to PostgreSQL database',
    runbookUrl: 'https://wiki.imobi.com/runbooks/database-connection-failed',
  },

  redisError: {
    severity: 'critical' as const,
    title: 'Redis Connection Failed',
    description: 'Cannot connect to Redis cache',
    runbookUrl: 'https://wiki.imobi.com/runbooks/redis-connection-failed',
  },

  highErrorRate: {
    severity: 'error' as const,
    title: 'High Error Rate Detected',
    description: 'API error rate exceeds 5% threshold',
    runbookUrl: 'https://wiki.imobi.com/runbooks/high-error-rate',
  },

  diskSpaceLow: {
    severity: 'critical' as const,
    title: 'Disk Space Critically Low',
    description: 'Available disk space is below 10%',
    runbookUrl: 'https://wiki.imobi.com/runbooks/disk-space-low',
  },

  memoryHigh: {
    severity: 'critical' as const,
    title: 'Memory Usage Critical',
    description: 'Memory usage exceeds 90%',
    runbookUrl: 'https://wiki.imobi.com/runbooks/high-memory-usage',
  },

  highResponseTime: {
    severity: 'error' as const,
    title: 'High Response Time',
    description: 'P95 response time exceeds 2 seconds',
    runbookUrl: 'https://wiki.imobi.com/runbooks/high-response-time',
  },

  slowQueries: {
    severity: 'error' as const,
    title: 'Slow Database Queries Detected',
    description: 'More than 20% of queries exceed 1 second',
    runbookUrl: 'https://wiki.imobi.com/runbooks/slow-queries',
  },

  deploymentFailure: {
    severity: 'error' as const,
    title: 'Deployment Failed',
    description: 'Recent deployment attempt failed',
    runbookUrl: 'https://wiki.imobi.com/runbooks/deployment-failure',
  },
};
