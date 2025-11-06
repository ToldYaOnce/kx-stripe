/**
 * Stripe webhook event types
 */
export type StripeWebhookEventType = 
  | 'payment_intent.succeeded'
  | 'payment_intent.failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | string;

/**
 * Configuration for Stripe webhook handling
 */
export interface StripeWebhookConfig {
  /**
   * Webhook endpoint path
   * @default '/stripe-webhook'
   */
  path?: string;
  
  /**
   * Event types to listen for
   */
  eventTypes?: StripeWebhookEventType[];
  
  /**
   * Webhook signing secret (from Stripe dashboard)
   */
  signingSecret?: string;
}

/**
 * Stripe environment (test vs live keys)
 */
export type StripeEnvironment = 'test' | 'live';

