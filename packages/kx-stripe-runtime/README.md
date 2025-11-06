# @toldyaonce/kx-stripe-runtime

Runtime utilities for Stripe integration in AWS Lambda functions.

## Installation

```bash
npm install @toldyaonce/kx-stripe-runtime
```

## Usage

### Client Management

```typescript
import { getInstance } from '@toldyaonce/kx-stripe-runtime';

export const handler = async (event) => {
  // Auto-fetches API key from Secrets Manager and caches it
  const stripe = await getInstance(process.env.STRIPE_SECRET_ARN!);
  
  // Now use stripe client
  const customer = await stripe.customers.create({
    email: 'customer@example.com'
  });
};
```

### Coupons & Promotion Codes

```typescript
import { createCoupon, createPromotionCode } from '@toldyaonce/kx-stripe-runtime';

// Create a coupon (50% off, one-time use)
const coupon = await createCoupon(stripe, {
  id: 'SUMMER50',
  percentOff: 50,
  duration: 'once',
  metadata: { tenantId: 'tenant_123' }
});

// Create a promotion code from the coupon
const promo = await createPromotionCode(stripe, {
  couponId: coupon.couponId,
  code: 'HIVE-SUMMER-ABC123',
  maxRedemptions: 1,
  metadata: {
    tenantId: 'tenant_123',
    userId: 'user_456',
    redemptionId: 'redemption_789'
  }
});

console.log('Give this code to the user:', promo.code);
```

### Customer Balance

```typescript
import { creditCustomerBalance } from '@toldyaonce/kx-stripe-runtime';

// Credit $10 to customer's account
const credit = await creditCustomerBalance(stripe, {
  customerId: 'cus_xxx',
  amount: 1000, // $10.00 in cents
  currency: 'usd',
  description: 'Reward redemption',
  metadata: {
    tenantId: 'tenant_123',
    redemptionId: 'redemption_456'
  }
});

console.log('New balance:', credit.endingBalance);
```

## Features

- ✅ **Auto-caching** - Client and secrets cached across Lambda invocations
- ✅ **Idempotency** - Built-in idempotency key generation for safe retries
- ✅ **Multi-tenant** - Standardized metadata helpers
- ✅ **TypeScript** - Full type safety with Stripe SDK v14
- ✅ **Error handling** - Comprehensive error wrapping

## API Reference

### Client

#### `getInstance(secretArn, options?)`
Get or create cached Stripe client (fetches from Secrets Manager)

#### `createClient(apiKey, options?)`
Create Stripe client with API key directly

#### `clearCache()`
Clear cached client (useful for testing)

### Coupons

#### `createCoupon(stripe, params)`
Create a Stripe coupon

**Params:**
- `id?` - Coupon ID
- `percentOff?` - Percentage discount (25 = 25%)
- `amountOff?` - Amount discount in cents
- `currency?` - Currency for amountOff
- `duration?` - 'once', 'repeating', or 'forever'
- `maxRedemptions?` - Max uses
- `metadata?` - Tracking data

#### `getCoupon(stripe, couponId)`
Retrieve a coupon

#### `deleteCoupon(stripe, couponId)`
Delete a coupon

### Promotion Codes

#### `createPromotionCode(stripe, params)`
Create a promotion code from a coupon

**Params:**
- `couponId` - (required) Coupon to create code for
- `code?` - Code string (auto-generated if not provided)
- `maxRedemptions?` - Max uses
- `expiresAt?` - Unix timestamp expiration
- `metadata?` - Tracking data

#### `getPromotionCode(stripe, id)`
Retrieve a promotion code

#### `deactivatePromotionCode(stripe, id)`
Deactivate a promotion code

#### `listPromotionCodesForCoupon(stripe, couponId)`
List all codes for a coupon

### Customer Balance

#### `creditCustomerBalance(stripe, params)`
Add credit to customer's account

**Params:**
- `customerId` - (required) Stripe customer ID
- `amount` - (required) Amount in cents
- `currency?` - Default 'usd'
- `description?` - Credit description
- `metadata?` - Tracking data

#### `debitCustomerBalance(stripe, params)`
Deduct from customer's account (same params)

#### `getCustomerBalance(stripe, customerId)`
Get current customer balance

#### `listBalanceTransactions(stripe, customerId)`
List all balance transactions

### Utilities

#### `generateIdempotencyKey(operation, params)`
Generate stable idempotency key from parameters

#### `isIdempotencyError(error)`
Check if error is due to idempotency

#### `createMetadata(metadata)`
Create sanitized metadata object (Stripe limits)

#### `extractTenantId(metadata)`
Extract tenantId from metadata

#### `extractUserId(metadata)`
Extract userId from metadata

## Multi-Tenant Support

All operations support metadata for tracking:

```typescript
const metadata = {
  tenantId: 'tenant_123',
  userId: 'user_456',
  rewardId: 'reward_789',
  redemptionId: 'redemption_101'
};

// Use in any operation
await createPromotionCode(stripe, {
  couponId: 'SUMMER50',
  metadata
});
```

## Error Handling

```typescript
try {
  const promo = await createPromotionCode(stripe, { ... });
} catch (error) {
  if (error.message.includes('Stripe error')) {
    // Handle Stripe-specific error
  }
  // Handle other errors
}
```

## License

MIT

