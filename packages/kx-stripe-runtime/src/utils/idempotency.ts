import { createHash } from 'crypto';

/**
 * Generate a stable idempotency key from operation parameters
 * This ensures the same operation with same parameters generates the same key
 * 
 * @param operation - Operation type (e.g., 'coupon', 'promo', 'balance-credit')
 * @param params - Operation parameters
 * @returns Idempotency key (max 255 characters for Stripe)
 * 
 * @example
 * ```typescript
 * const key = generateIdempotencyKey('balance-credit', {
 *   customerId: 'cus_123',
 *   amount: 1000,
 *   metadata: { redemptionId: 'redemption_456' }
 * });
 * ```
 */
export function generateIdempotencyKey(
  operation: string,
  params: any
): string {
  // Create a stable string representation of the parameters
  // Sort keys to ensure consistent ordering
  const sortedParams = sortObjectKeys(params);
  const paramsString = JSON.stringify(sortedParams);
  
  // Hash the parameters to create a stable, short key
  const hash = createHash('sha256')
    .update(`${operation}:${paramsString}`)
    .digest('hex')
    .substring(0, 32); // Take first 32 chars of hash
  
  // Format: operation-hash-timestamp
  // Max 255 chars for Stripe, this will be well under
  return `${operation}-${hash}`;
}

/**
 * Sort object keys recursively for consistent hashing
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  const sorted: any = {};
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sorted[key] = sortObjectKeys(obj[key]);
    });
  
  return sorted;
}

/**
 * Extract idempotency key from Stripe error
 * Useful for debugging duplicate request errors
 */
export function extractIdempotencyKeyFromError(error: any): string | null {
  if (error?.headers?.['idempotency-key']) {
    return error.headers['idempotency-key'];
  }
  
  if (error?.raw?.headers?.['idempotency-key']) {
    return error.raw.headers['idempotency-key'];
  }
  
  return null;
}

/**
 * Check if error is due to idempotency key mismatch
 */
export function isIdempotencyError(error: any): boolean {
  if (!error?.type) return false;
  
  return (
    error.type === 'idempotency_error' ||
    error.code === 'idempotency_key_in_use'
  );
}

