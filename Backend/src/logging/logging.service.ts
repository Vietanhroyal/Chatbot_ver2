import { Injectable, Logger } from '@nestjs/common';
import { InteractionLog, AiMetricsLog, RetrievalLog } from './logging.types';

/**
 * Centralized logging service for AI pipeline observability.
 *
 * MVP: Outputs structured JSON to console (easily parseable by log aggregators).
 * Future: Write to PostgreSQL, send to monitoring dashboard.
 *
 * All methods are fire-and-forget — they never throw and never block
 * the main request flow.
 */
@Injectable()
export class LoggingService {
  private readonly logger = new Logger('AILogger');

  /**
   * Log a complete chat interaction after the agent finishes.
   * Called by AiChatService at the end of processMessage().
   */
  logInteraction(data: InteractionLog): void {
    try {
      this.logger.log(
        JSON.stringify({
          type: 'interaction',
          timestamp: new Date().toISOString(),
          ...data,
        }),
      );
    } catch {
      // Never let logging crash the app
    }
  }

  /**
   * Log metrics from an individual LLM call within a node.
   * Called by nodes that invoke OpenAI (intent-detection, reasoning, etc.)
   */
  logAiMetrics(data: AiMetricsLog): void {
    try {
      this.logger.log(
        JSON.stringify({
          type: 'ai_metrics',
          timestamp: new Date().toISOString(),
          ...data,
        }),
      );
    } catch {
      // Never let logging crash the app
    }
  }

  /**
   * Log knowledge retrieval results for RAG quality tracking.
   * Called by the knowledge-retrieval node.
   */
  logRetrieval(data: RetrievalLog): void {
    try {
      this.logger.log(
        JSON.stringify({
          type: 'retrieval',
          timestamp: new Date().toISOString(),
          ...data,
        }),
      );
    } catch {
      // Never let logging crash the app
    }
  }

  /**
   * Generic structured log for pipeline steps.
   * Use for debugging during development.
   */
  logStep(sessionId: string, step: string, detail: string): void {
    try {
      this.logger.log(
        JSON.stringify({
          type: 'pipeline_step',
          timestamp: new Date().toISOString(),
          sessionId,
          step,
          detail,
        }),
      );
    } catch {
      // Never let logging crash the app
    }
  }
}
