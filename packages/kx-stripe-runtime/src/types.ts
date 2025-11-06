/**
 * Common error types for Stripe operations
 */
export type StripeErrorType =
  | 'api_error'
  | 'card_error'
  | 'idempotency_error'
  | 'invalid_request_error'
  | 'rate_limit_error'
  | 'authentication_error'
  | 'api_connection_error';

/**
 * Standardized error response
 */
export interface StripeOperationError {
  type: StripeErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  requestId?: string;
}

/**
 * Result wrapper for operations that might fail
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: StripeOperationError;
}

/**
 * Webhook event types we care about
 */
export type WebhookEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted';

/**
 * Webhook payload structure
 */
export interface WebhookPayload<T = any> {
  id: string;
  object: 'event';
  type: WebhookEventType;
  data: {
    object: T;
    previous_attributes?: Partial<T>;
  };
  created: number;
  livemode: boolean;
  request?: {
    id: string | null;
    idempotency_key: string | null;
  };
}

