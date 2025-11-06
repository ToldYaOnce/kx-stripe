import Stripe from 'stripe';
import { generateIdempotencyKey } from '../utils/idempotency';

export interface CreatePromotionCodeParams {
  /**
   * ID of the coupon to create promotion code for
   */
  couponId: string;
  
  /**
   * The promotion code (e.g., "HIVE-SUMMER-ABC123")
   * If not provided, Stripe will generate one
   */
  code?: string;
  
  /**
   * Maximum number of times this code can be redeemed
   */
  maxRedemptions?: number;
  
  /**
   * Unix timestamp when the code expires
   */
  expiresAt?: number;
  
  /**
   * Whether the code is currently active
   * @default true
   */
  active?: boolean;
  
  /**
   * Metadata for tracking (e.g., tenantId, userId, rewardId, redemptionId)
   */
  metadata?: Record<string, string>;
  
  /**
   * Restrictions for who can use the code
   */
  restrictions?: {
    /**
     * Only allow first-time customers
     */
    firstTimeTransaction?: boolean;
    
    /**
     * Minimum order amount in cents
     */
    minimumAmount?: number;
    
    /**
     * Currency for minimum amount
     */
    minimumAmountCurrency?: string;
  };
  
  /**
   * Custom idempotency key (auto-generated if not provided)
   */
  idempotencyKey?: string;
}

export interface CreatePromotionCodeResult {
  promotionCodeId: string;
  code: string;
  couponId: string;
  active: boolean;
  maxRedemptions?: number;
  expiresAt?: number;
  timesRedeemed: number;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe Promotion Code from an existing coupon
 * This generates a user-facing code that can be applied at checkout
 * 
 * @param stripe - Stripe client instance
 * @param params - Promotion code creation parameters
 * @returns Created promotion code details
 * 
 * @example
 * ```typescript
 * // First create a coupon, then create a promotion code
 * const promo = await createPromotionCode(stripe, {
 *   couponId: 'HIVE-50-OFF',
 *   code: 'HIVE-REWARD-ABC123',
 *   maxRedemptions: 1,
 *   metadata: {
 *     tenantId: 'tenant_123',
 *     userId: 'user_456',
 *     redemptionId: 'redemption_789'
 *   }
 * });
 * 
 * console.log('Give this code to the user:', promo.code);
 * ```
 */
export async function createPromotionCode(
  stripe: Stripe,
  params: CreatePromotionCodeParams
): Promise<CreatePromotionCodeResult> {
  const {
    couponId,
    code,
    maxRedemptions,
    expiresAt,
    active = true,
    metadata,
    restrictions,
    idempotencyKey
  } = params;

  try {
    // Build promotion code parameters
    const promoParams: Stripe.PromotionCodeCreateParams = {
      coupon: couponId,
      ...(code && { code }),
      ...(maxRedemptions && { max_redemptions: maxRedemptions }),
      ...(expiresAt && { expires_at: expiresAt }),
      active,
      ...(metadata && { metadata }),
      ...(restrictions && {
        restrictions: {
          ...(restrictions.firstTimeTransaction !== undefined && {
            first_time_transaction: restrictions.firstTimeTransaction
          }),
          ...(restrictions.minimumAmount && {
            minimum_amount: restrictions.minimumAmount,
            minimum_amount_currency: restrictions.minimumAmountCurrency || 'usd'
          })
        }
      })
    };

    // Generate idempotency key for safe retries
    const key = idempotencyKey || generateIdempotencyKey('promo', params);

    console.log('🎫 Creating Stripe promotion code:', { couponId, code: code || 'auto' });

    const promotionCode = await stripe.promotionCodes.create(promoParams, {
      idempotencyKey: key
    });

    console.log('✅ Promotion code created:', promotionCode.code);

    return {
      promotionCodeId: promotionCode.id,
      code: promotionCode.code,
      couponId: promotionCode.coupon.id,
      active: promotionCode.active,
      maxRedemptions: promotionCode.max_redemptions ?? undefined,
      expiresAt: promotionCode.expires_at ?? undefined,
      timesRedeemed: promotionCode.times_redeemed,
      metadata: promotionCode.metadata ?? undefined
    };

  } catch (error) {
    console.error('❌ Failed to create promotion code:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error: ${error.message} (${error.type})`);
    }
    
    throw error;
  }
}

/**
 * Retrieve an existing promotion code
 */
export async function getPromotionCode(
  stripe: Stripe,
  promotionCodeId: string
): Promise<Stripe.PromotionCode> {
  try {
    return await stripe.promotionCodes.retrieve(promotionCodeId);
  } catch (error) {
    console.error('❌ Failed to retrieve promotion code:', error);
    throw error;
  }
}

/**
 * Deactivate a promotion code (makes it unusable)
 */
export async function deactivatePromotionCode(
  stripe: Stripe,
  promotionCodeId: string
): Promise<Stripe.PromotionCode> {
  try {
    const updated = await stripe.promotionCodes.update(promotionCodeId, {
      active: false
    });
    console.log('✅ Promotion code deactivated:', promotionCodeId);
    return updated;
  } catch (error) {
    console.error('❌ Failed to deactivate promotion code:', error);
    throw error;
  }
}

/**
 * List all promotion codes for a coupon
 */
export async function listPromotionCodesForCoupon(
  stripe: Stripe,
  couponId: string,
  limit: number = 100
): Promise<Stripe.PromotionCode[]> {
  try {
    const result = await stripe.promotionCodes.list({
      coupon: couponId,
      limit
    });
    return result.data;
  } catch (error) {
    console.error('❌ Failed to list promotion codes:', error);
    throw error;
  }
}

