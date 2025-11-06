# KX-Stripe

**Reusable Stripe integration for AWS CDK and Lambda runtime**

A production-ready, multi-tenant Stripe integration for serverless AWS applications. Built for the KxGrynde ecosystem but designed to be reusable across any project.

---

## 📦 Packages

### `@toldyaonce/kx-stripe-cdk`
CDK constructs for Stripe infrastructure (Secrets Manager, webhooks, etc.)

### `@toldyaonce/kx-stripe-runtime`
Runtime utilities for Lambda functions (coupons, balance credits, idempotency, etc.)

---

## 🚀 Quick Start

### Installation

```bash
# CDK package (for infrastructure)
npm install @toldyaonce/kx-stripe-cdk

# Runtime package (for Lambda handlers)
npm install @toldyaonce/kx-stripe-runtime
```

### CDK Setup

```typescript
import { StripeSecretConstruct } from '@toldyaonce/kx-stripe-cdk';

// In your CDK stack
const stripeSecret = new StripeSecretConstruct(this, 'StripeSecret', {
  secretName: 'myapp/stripe-key',
  description: 'Stripe API key for payment processing'
});

// Grant Lambda read access
stripeSecret.grantRead(myRedeemLambda);
```

### Lambda Runtime Usage

```typescript
import { 
  getInstance, 
  createPromotionCode, 
  creditCustomerBalance 
} from '@toldyaonce/kx-stripe-runtime';

export const handler = async (event) => {
  // Auto-fetches API key from Secrets Manager and caches it
  const stripe = await getInstance(process.env.STRIPE_SECRET_ARN!);
  
  // Create a promotion code
  const promo = await createPromotionCode(stripe, {
    couponId: 'SUMMER50',
    code: 'HIVE-REWARD-ABC123',
    maxRedemptions: 1,
    metadata: {
      tenantId: 'tenant_123',
      userId: 'user_456',
      redemptionId: 'redemption_789'
    }
  });
  
  // Or credit customer balance
  const credit = await creditCustomerBalance(stripe, {
    customerId: 'cus_xxx',
    amount: 1000, // $10.00 in cents
    currency: 'usd',
    metadata: {
      tenantId: 'tenant_123',
      rewardId: 'reward_456'
    }
  });
  
  return { success: true, code: promo.code };
};
```

---

## 🎯 Features

### CDK Constructs
- ✅ **StripeSecretConstruct** - Manages Stripe API keys in Secrets Manager
- ✅ Easy IAM permission management
- ✅ CloudFormation outputs for cross-stack references

### Runtime Utilities
- ✅ **Client Management** - Auto-fetch from Secrets Manager, caching across invocations
- ✅ **Coupons** - Create, retrieve, delete coupons
- ✅ **Promotion Codes** - Generate user-facing codes from coupons
- ✅ **Customer Balance** - Credit/debit customer accounts
- ✅ **Idempotency** - Built-in idempotency key generation for safe retries
- ✅ **Metadata** - Standardized metadata helpers for multi-tenant tracking
- ✅ **TypeScript-first** - Full type safety with Stripe SDK v14

---

## 📖 API Reference

### CDK Package

#### `StripeSecretConstruct`

```typescript
new StripeSecretConstruct(scope, id, {
  secretName?: string;           // Default: 'stripe-api-key'
  description?: string;
  secretValue?: string;          // For dev only!
  existingSecretArn?: string;    // Use existing secret
  removalPolicy?: RemovalPolicy; // Default: RETAIN
});

// Methods
stripeSecret.grantRead(lambda);
stripeSecret.grantWrite(lambda);
```

### Runtime Package

#### Client

```typescript
// Get cached instance (fetches from Secrets Manager)
const stripe = await getInstance(secretArn: string, options?: StripeConfig);

// Create with API key directly
const stripe = createClient(apiKey: string, options?: StripeConfig);

// Clear cache (for testing)
clearCache();
```

#### Coupons

```typescript
await createCoupon(stripe, {
  id?: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration?: 'once' | 'repeating' | 'forever';
  maxRedemptions?: number;
  metadata?: Record<string, string>;
});

await getCoupon(stripe, couponId);
await deleteCoupon(stripe, couponId);
```

#### Promotion Codes

```typescript
await createPromotionCode(stripe, {
  couponId: string;
  code?: string;
  maxRedemptions?: number;
  expiresAt?: number;
  metadata?: Record<string, string>;
});

await getPromotionCode(stripe, promotionCodeId);
await deactivatePromotionCode(stripe, promotionCodeId);
await listPromotionCodesForCoupon(stripe, couponId);
```

#### Customer Balance

```typescript
await creditCustomerBalance(stripe, {
  customerId: string;
  amount: number;              // In cents
  currency?: string;           // Default: 'usd'
  description?: string;
  metadata?: Record<string, string>;
});

await debitCustomerBalance(stripe, params);
await getCustomerBalance(stripe, customerId);
await listBalanceTransactions(stripe, customerId);
```

#### Utilities

```typescript
// Idempotency
const key = generateIdempotencyKey('operation', params);
const isIdempotent = isIdempotencyError(error);

// Metadata
const metadata = createMetadata({
  tenantId: 'tenant_123',
  userId: 'user_456',
  rewardId: 'reward_789'
});
```

---

## 🏗️ Development

### First-Time Setup

```bash
# 1. Clone/navigate to the repo
cd c:/projects/KxGrynde/kx-stripe

# 2. Create .npmrc from example
cp .npmrc.example .npmrc

# 3. Add your GitHub token to .npmrc
# Get token from: https://github.com/settings/tokens
# Required scopes: write:packages, read:packages
# Replace YOUR_GITHUB_TOKEN in .npmrc with your actual token

# 4. Install dependencies
pnpm install

# 5. Build all packages
pnpm build
```

### Build All Packages

```bash
pnpm install
pnpm build
```

### Publish Packages

```bash
# Make scripts executable (first time only)
chmod +x scripts/publish-all.sh
chmod +x packages/kx-stripe-cdk/build-and-publish.sh
chmod +x packages/kx-stripe-runtime/build-and-publish.sh

# Publish both packages at once
bash scripts/publish-all.sh patch   # 1.0.0 → 1.0.1
bash scripts/publish-all.sh minor   # 1.0.0 → 1.1.0
bash scripts/publish-all.sh major   # 1.0.0 → 2.0.0

# Or publish individually
cd packages/kx-stripe-cdk && bash build-and-publish.sh patch
cd packages/kx-stripe-runtime && bash build-and-publish.sh patch

# Or use npm scripts
npm run publish:all      # Publish both
npm run publish:cdk      # CDK only
npm run publish:runtime  # Runtime only
```

---

## 🎨 Design Principles

1. **Multi-tenant by default** - All operations support metadata tracking
2. **Idempotency built-in** - Safe retries with auto-generated keys
3. **Caching optimized** - Client and secret caching for cold start performance
4. **TypeScript-first** - Full type safety throughout
5. **Error handling** - Comprehensive error wrapping and logging
6. **Reusable** - No hardcoded assumptions, works across projects

---

## 📋 Use Cases

- **Rewards Systems** - Create promotion codes for point redemptions (KxHive)
- **Credits** - Add balance credits to customer accounts
- **Subscriptions** - Manage recurring payments (future)
- **Webhooks** - Process Stripe events (future)
- **Multi-tenant SaaS** - Track operations per tenant with metadata

---

## 🔒 Security

- API keys stored in AWS Secrets Manager
- IAM-based access control
- No hardcoded secrets
- Automatic secret rotation support (via Secrets Manager)

---

## 📝 License

MIT

---

## 👨‍💻 Author

**KxGrynde Development Team**

Built with 💪 for the KX ecosystem

