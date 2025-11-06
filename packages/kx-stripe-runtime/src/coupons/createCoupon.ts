import Stripe from 'stripe';
import { generateIdempotencyKey } from '../utils/idempotency';

export interface CreateCouponParams {
  /**
   * Unique identifier for the coupon (e.g., "SUMMER50")
   */
  id?: string;
  
  /**
   * Percentage off (e.g., 25 for 25% off)
   * Use either percentOff OR amountOff, not both
   */
  percentOff?: number;
  
  /**
   * Amount off in cents (e.g., 1000 for $10.00 off)
   * Use either percentOff OR amountOff, not both
   */
  amountOff?: number;
  
  /**
   * Currency for amountOff (required if using amountOff)
   */
  currency?: string;
  
  /**
   * Duration: 'once', 'repeating', or 'forever'
   * @default 'once'
   */
  duration?: 'once' | 'repeating' | 'forever';
  
  /**
   * Number of months for 'repeating' duration
   */
  durationInMonths?: number;
  
  /**
   * Maximum number of times this coupon can be redeemed
   */
  maxRedemptions?: number;
  
  /**
   * Unix timestamp for when coupon expires
   */
  redeemBy?: number;
  
  /**
   * Coupon name/description
   */
  name?: string;
  
  /**
   * Metadata for tracking (e.g., tenantId, userId, rewardId)
   */
  metadata?: Record<string, string>;
  
  /**
   * Custom idempotency key (auto-generated if not provided)
   */
  idempotencyKey?: string;
}

export interface CreateCouponResult {
  couponId: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration: string;
  name?: string;
  valid: boolean;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe coupon for discounts
 * 
 * @param stripe - Stripe client instance
 * @param params - Coupon creation parameters
 * @returns Created coupon details
 * 
 * @example
 * ```typescript
 * const coupon = await createCoupon(stripe, {
 *   id: 'HIVE-REWARD-50',
 *   percentOff: 50,
 *   duration: 'once',
 *   name: 'KxHive 50% Reward',
 *   metadata: {
 *     tenantId: 'tenant_123',
 *     userId: 'user_456',
 *     rewardId: 'reward_789'
 *   }
 * });
 * ```
 */
export async function createCoupon(
  stripe: Stripe,
  params: CreateCouponParams
): Promise<CreateCouponResult> {
  const {
    id,
    percentOff,
    amountOff,
    currency = 'usd',
    duration = 'once',
    durationInMonths,
    maxRedemptions,
    redeemBy,
    name,
    metadata,
    idempotencyKey
  } = params;

  // Validation
  if (!percentOff && !amountOff) {
    throw new Error('Must provide either percentOff or amountOff');
  }

  if (percentOff && amountOff) {
    throw new Error('Cannot provide both percentOff and amountOff');
  }

  if (amountOff && !currency) {
    throw new Error('currency is required when using amountOff');
  }

  if (duration === 'repeating' && !durationInMonths) {
    throw new Error('durationInMonths is required for repeating coupons');
  }

  try {
    // Build coupon parameters
    const couponParams: Stripe.CouponCreateParams = {
      ...(id && { id }),
      ...(percentOff && { percent_off: percentOff }),
      ...(amountOff && { amount_off: amountOff }),
      ...(amountOff && { currency: currency.toLowerCase() }),
      duration,
      ...(durationInMonths && { duration_in_months: durationInMonths }),
      ...(maxRedemptions && { max_redemptions: maxRedemptions }),
      ...(redeemBy && { redeem_by: redeemBy }),
      ...(name && { name }),
      ...(metadata && { metadata })
    };

    // Generate idempotency key for safe retries
    const key = idempotencyKey || generateIdempotencyKey('coupon', params);

    console.log('🎟️ Creating Stripe coupon:', { id: id || 'auto', percentOff, amountOff, duration });

    const coupon = await stripe.coupons.create(couponParams, {
      idempotencyKey: key
    });

    console.log('✅ Coupon created successfully:', coupon.id);

    return {
      couponId: coupon.id,
      percentOff: coupon.percent_off ?? undefined,
      amountOff: coupon.amount_off ?? undefined,
      currency: coupon.currency ?? undefined,
      duration: coupon.duration,
      name: coupon.name ?? undefined,
      valid: coupon.valid,
      metadata: coupon.metadata ?? undefined
    };

  } catch (error) {
    console.error('❌ Failed to create coupon:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error: ${error.message} (${error.type})`);
    }
    
    throw error;
  }
}

/**
 * Retrieve an existing coupon by ID
 */
export async function getCoupon(
  stripe: Stripe,
  couponId: string
): Promise<Stripe.Coupon> {
  try {
    return await stripe.coupons.retrieve(couponId);
  } catch (error) {
    console.error('❌ Failed to retrieve coupon:', error);
    throw error;
  }
}

/**
 * Delete a coupon (makes it invalid)
 */
export async function deleteCoupon(
  stripe: Stripe,
  couponId: string
): Promise<void> {
  try {
    await stripe.coupons.del(couponId);
    console.log('✅ Coupon deleted:', couponId);
  } catch (error) {
    console.error('❌ Failed to delete coupon:', error);
    throw error;
  }
}

