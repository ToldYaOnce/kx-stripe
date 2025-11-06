// Client
export { getInstance, createClient, clearCache } from './client/StripeClient';

// Coupons
export { 
  createCoupon, 
  getCoupon, 
  deleteCoupon 
} from './coupons/createCoupon';
export type { 
  CreateCouponParams, 
  CreateCouponResult 
} from './coupons/createCoupon';

// Promotion Codes
export {
  createPromotionCode,
  getPromotionCode,
  deactivatePromotionCode,
  listPromotionCodesForCoupon
} from './coupons/createPromotionCode';
export type {
  CreatePromotionCodeParams,
  CreatePromotionCodeResult
} from './coupons/createPromotionCode';

// Customer Balance
export {
  creditCustomerBalance,
  debitCustomerBalance,
  getCustomerBalance,
  listBalanceTransactions
} from './balance/creditCustomerBalance';
export type {
  CreditCustomerBalanceParams,
  CreditCustomerBalanceResult
} from './balance/creditCustomerBalance';

// Utilities
export {
  generateIdempotencyKey,
  extractIdempotencyKeyFromError,
  isIdempotencyError
} from './utils/idempotency';

export {
  createMetadata,
  extractTenantId,
  extractUserId,
  mergeMetadata
} from './utils/metadata';
export type { StandardMetadata } from './utils/metadata';

// Types
export type {
  StripeErrorType,
  StripeOperationError,
  OperationResult,
  WebhookEventType,
  WebhookPayload
} from './types';

