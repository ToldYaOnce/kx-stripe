import Stripe from 'stripe';
import { generateIdempotencyKey } from '../utils/idempotency';

export interface CreditCustomerBalanceParams {
  /**
   * Stripe customer ID (e.g., "cus_xxx")
   */
  customerId: string;
  
  /**
   * Amount to credit in cents (e.g., 1000 for $10.00)
   */
  amount: number;
  
  /**
   * Currency code (e.g., "usd")
   * @default 'usd'
   */
  currency?: string;
  
  /**
   * Description of the credit
   */
  description?: string;
  
  /**
   * Metadata for tracking (e.g., tenantId, userId, rewardId, redemptionId)
   */
  metadata?: Record<string, string>;
  
  /**
   * Custom idempotency key (auto-generated if not provided)
   */
  idempotencyKey?: string;
}

export interface CreditCustomerBalanceResult {
  transactionId: string;
  customerId: string;
  amount: number;
  currency: string;
  endingBalance: number;
  description?: string;
  metadata?: Record<string, string>;
}

/**
 * Credit a customer's Stripe balance
 * This adds credit to the customer's account that can be used for future payments
 * 
 * @param stripe - Stripe client instance
 * @param params - Credit parameters
 * @returns Balance transaction details
 * 
 * @example
 * ```typescript
 * const credit = await creditCustomerBalance(stripe, {
 *   customerId: 'cus_xxx',
 *   amount: 1000, // $10.00
 *   currency: 'usd',
 *   description: 'KxHive reward redemption',
 *   metadata: {
 *     tenantId: 'tenant_123',
 *     userId: 'user_456',
 *     redemptionId: 'redemption_789'
 *   }
 * });
 * ```
 */
export async function creditCustomerBalance(
  stripe: Stripe,
  params: CreditCustomerBalanceParams
): Promise<CreditCustomerBalanceResult> {
  const {
    customerId,
    amount,
    currency = 'usd',
    description = 'Account credit',
    metadata,
    idempotencyKey
  } = params;

  // Validation
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  if (!customerId || !customerId.startsWith('cus_')) {
    throw new Error('Invalid customer ID format (must start with cus_)');
  }

  try {
    // Generate idempotency key for safe retries
    const key = idempotencyKey || generateIdempotencyKey('balance-credit', params);

    console.log('💰 Crediting customer balance:', { customerId, amount, currency });

    const transaction = await stripe.customers.createBalanceTransaction(
      customerId,
      {
        amount: -amount, // Negative amount = credit
        currency: currency.toLowerCase(),
        description,
        ...(metadata && { metadata })
      },
      {
        idempotencyKey: key
      }
    );

    console.log('✅ Balance credited successfully:', transaction.id);

    return {
      transactionId: transaction.id,
      customerId: transaction.customer as string,
      amount: Math.abs(transaction.amount),
      currency: transaction.currency,
      endingBalance: transaction.ending_balance,
      description: transaction.description ?? undefined,
      metadata: transaction.metadata ?? undefined
    };

  } catch (error) {
    console.error('❌ Failed to credit customer balance:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error: ${error.message} (${error.type})`);
    }
    
    throw error;
  }
}

/**
 * Debit a customer's Stripe balance (reduce credit)
 * 
 * @param stripe - Stripe client instance
 * @param params - Debit parameters (same as credit)
 * @returns Balance transaction details
 */
export async function debitCustomerBalance(
  stripe: Stripe,
  params: CreditCustomerBalanceParams
): Promise<CreditCustomerBalanceResult> {
  const {
    customerId,
    amount,
    currency = 'usd',
    description = 'Account debit',
    metadata,
    idempotencyKey
  } = params;

  // Validation
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  if (!customerId || !customerId.startsWith('cus_')) {
    throw new Error('Invalid customer ID format (must start with cus_)');
  }

  try {
    // Generate idempotency key for safe retries
    const key = idempotencyKey || generateIdempotencyKey('balance-debit', params);

    console.log('💸 Debiting customer balance:', { customerId, amount, currency });

    const transaction = await stripe.customers.createBalanceTransaction(
      customerId,
      {
        amount: amount, // Positive amount = debit
        currency: currency.toLowerCase(),
        description,
        ...(metadata && { metadata })
      },
      {
        idempotencyKey: key
      }
    );

    console.log('✅ Balance debited successfully:', transaction.id);

    return {
      transactionId: transaction.id,
      customerId: transaction.customer as string,
      amount: transaction.amount,
      currency: transaction.currency,
      endingBalance: transaction.ending_balance,
      description: transaction.description ?? undefined,
      metadata: transaction.metadata ?? undefined
    };

  } catch (error) {
    console.error('❌ Failed to debit customer balance:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error: ${error.message} (${error.type})`);
    }
    
    throw error;
  }
}

/**
 * Get a customer's current balance
 */
export async function getCustomerBalance(
  stripe: Stripe,
  customerId: string
): Promise<{ balance: number; currency: string }> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer.deleted) {
      throw new Error('Customer has been deleted');
    }

    return {
      balance: customer.balance || 0,
      currency: customer.currency || 'usd'
    };
  } catch (error) {
    console.error('❌ Failed to get customer balance:', error);
    throw error;
  }
}

/**
 * List balance transactions for a customer
 */
export async function listBalanceTransactions(
  stripe: Stripe,
  customerId: string,
  limit: number = 100
): Promise<Stripe.CustomerBalanceTransaction[]> {
  try {
    const result = await stripe.customers.listBalanceTransactions(customerId, {
      limit
    });
    return result.data;
  } catch (error) {
    console.error('❌ Failed to list balance transactions:', error);
    throw error;
  }
}

