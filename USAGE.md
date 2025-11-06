# KX-Stripe Usage Guide

## 🎯 Quick Integration for KxHive

### Step 1: Install Packages

```bash
# In your KxHive infrastructure package
cd packages/infra
npm install @toldyaonce/kx-stripe-cdk

# In your KxHive rewards package  
cd packages/hive-rewards
npm install @toldyaonce/kx-stripe-runtime
```

### Step 2: CDK Stack Setup

```typescript
// packages/infra/lib/HiveRewardsStack.ts
import { StripeSecretConstruct } from '@toldyaonce/kx-stripe-cdk';

export class HiveRewardsStack extends Stack {
  public readonly stripeSecret: StripeSecretConstruct;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create Stripe secret
    this.stripeSecret = new StripeSecretConstruct(this, 'StripeSecret', {
      secretName: 'kxhive/stripe-api-key',
      description: 'Stripe API key for KxHive rewards fulfillment',
      removalPolicy: RemovalPolicy.RETAIN
    });

    // Output for manual secret population
    new CfnOutput(this, 'StripeSecretArn', {
      value: this.stripeSecret.secretArn,
      description: 'Populate this secret with your Stripe API key',
      exportName: 'KxHive-StripeSecretArn'
    });
  }
}
```

### Step 3: Grant Lambda Access

```typescript
// packages/infra/lib/HiveCoreStack.ts
import { HiveRewardsStack } from './HiveRewardsStack';

export class HiveCoreStack extends Stack {
  constructor(scope: Construct, id: string, rewardsStack: HiveRewardsStack) {
    super(scope, id);

    // Create redeem handler
    const redeemHandler = new NodejsFunction(this, 'RedeemHandler', {
      entry: path.join(__dirname, '../../hive-core/src/redeemHandler.ts'),
      handler: 'handler',
      environment: {
        STRIPE_SECRET_ARN: rewardsStack.stripeSecret.secretArn,
        REWARDS_TABLE: rewardsTable.tableName
      }
    });

    // Grant access to Stripe secret
    rewardsStack.stripeSecret.grantRead(redeemHandler);
  }
}
```

### Step 4: Redeem Handler Implementation

```typescript
// packages/hive-core/src/redeemHandler.ts
import { 
  getInstance, 
  createCoupon, 
  createPromotionCode,
  creditCustomerBalance 
} from '@toldyaonce/kx-stripe-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: any) => {
  const { tenantId, userId, rewardId } = parseEvent(event);
  
  try {
    // 1. Fetch reward from DynamoDB
    const reward = await dynamodb.send(new GetCommand({
      TableName: process.env.REWARDS_TABLE!,
      Key: { tenantId, rewardId }
    }));

    if (!reward.Item || !reward.Item.active) {
      throw new Error('Reward not found or inactive');
    }

    // 2. Get Stripe client (auto-cached)
    const stripe = await getInstance(process.env.STRIPE_SECRET_ARN!);

    let fulfillmentResult;

    // 3. Fulfill based on reward type
    if (reward.Item.type === 'coupon') {
      // Create coupon and promotion code
      const coupon = await createCoupon(stripe, {
        percentOff: reward.Item.percentOff,
        duration: 'once',
        name: reward.Item.name,
        metadata: {
          tenantId,
          userId,
          rewardId,
          source: 'kxhive'
        }
      });

      const promo = await createPromotionCode(stripe, {
        couponId: coupon.couponId,
        maxRedemptions: 1,
        metadata: {
          tenantId,
          userId,
          rewardId,
          redemptionId: generateRedemptionId()
        }
      });

      fulfillmentResult = {
        type: 'coupon',
        code: promo.code,
        promotionCodeId: promo.promotionCodeId
      };

    } else if (reward.Item.type === 'credit') {
      // Credit customer balance
      const credit = await creditCustomerBalance(stripe, {
        customerId: reward.Item.stripeCustomerId || userId,
        amount: reward.Item.creditAmount,
        currency: 'usd',
        description: `KxHive reward: ${reward.Item.name}`,
        metadata: {
          tenantId,
          userId,
          rewardId,
          redemptionId: generateRedemptionId()
        }
      });

      fulfillmentResult = {
        type: 'credit',
        transactionId: credit.transactionId,
        amount: credit.amount,
        newBalance: credit.endingBalance
      };
    }

    // 4. Record redemption in DynamoDB
    await dynamodb.send(new PutCommand({
      TableName: process.env.REDEMPTIONS_TABLE!,
      Item: {
        tenantId,
        userId,
        redemptionId: fulfillmentResult.redemptionId,
        rewardId,
        status: 'FULFILLED',
        fulfillmentRef: fulfillmentResult.transactionId || fulfillmentResult.promotionCodeId,
        fulfilledAt: new Date().toISOString(),
        ...fulfillmentResult
      }
    }));

    // 5. Return success
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'FULFILLED',
        ...fulfillmentResult
      })
    };

  } catch (error) {
    console.error('❌ Redemption failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

function parseEvent(event: any) {
  const body = JSON.parse(event.body);
  return {
    tenantId: event.requestContext.authorizer.tenantId,
    userId: event.requestContext.authorizer.sub,
    rewardId: body.rewardId
  };
}

function generateRedemptionId() {
  return `redemption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### Step 5: Deploy

```bash
# Deploy rewards stack first (creates secret)
cdk deploy HiveRewardsStack

# Populate the secret with your Stripe API key
aws secretsmanager put-secret-value \
  --secret-id kxhive/stripe-api-key \
  --secret-string "sk_test_your_stripe_key_here"

# Deploy core stack (creates lambdas)
cdk deploy HiveCoreStack
```

### Step 6: Test

```bash
# Test redemption
curl -X POST https://api.kxhive.com/redeem \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rewardId": "reward_123"}'

# Response:
# {
#   "status": "FULFILLED",
#   "type": "coupon",
#   "code": "HIVE-REWARD-ABC123"
# }
```

---

## 🔧 Development Workflow

### Build kx-stripe Locally

```bash
cd c:/projects/KxGrynde/kx-stripe
pnpm install
pnpm build
```

### Publish New Version

```bash
# Patch (1.0.0 → 1.0.1)
bash scripts/publish-all.sh patch

# Minor (1.0.0 → 1.1.0)
bash scripts/publish-all.sh minor

# Major (1.0.0 → 2.0.0)
bash scripts/publish-all.sh major
```

### Use in KxHive

```bash
cd c:/projects/KxGrynde/kx-hive
npm install @toldyaonce/kx-stripe-cdk@latest
npm install @toldyaonce/kx-stripe-runtime@latest
```

---

## 🎨 Advanced Usage

### Custom Coupon Template

```typescript
// Create a template coupon for all rewards
const templateCoupon = await createCoupon(stripe, {
  id: 'HIVE-50-TEMPLATE',
  percentOff: 50,
  duration: 'once',
  maxRedemptions: 1000
});

// Then create individual codes as needed
const userCode = await createPromotionCode(stripe, {
  couponId: templateCoupon.couponId,
  code: `HIVE-${userId}-${Date.now()}`,
  maxRedemptions: 1
});
```

### Balance Rollback on Failure

```typescript
try {
  // Deduct points from ledger
  await deductPoints(tenantId, userId, costPoints);
  
  // Fulfill with Stripe
  const fulfillment = await creditCustomerBalance(stripe, { ... });
  
  return { success: true, fulfillment };
  
} catch (error) {
  // Rollback: Add points back
  await addPoints(tenantId, userId, costPoints, 'ROLLBACK');
  
  throw error;
}
```

---

## 🚨 Important Notes

1. **API Keys** - Use test keys (`sk_test_...`) for development, live keys (`sk_live_...`) for production
2. **Secrets Manager** - Always populate secrets via Console/CLI, never hardcode in CDK
3. **Idempotency** - All operations use auto-generated idempotency keys for safe retries
4. **Metadata** - Always include `tenantId` for multi-tenant tracking
5. **Error Handling** - Wrap all Stripe operations in try/catch blocks

---

## 📚 Resources

- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Dashboard](https://dashboard.stripe.com/)
- [KxHive Spec](../kx-hive/SPEC.md)

