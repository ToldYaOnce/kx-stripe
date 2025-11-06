# @toldyaonce/kx-stripe-cdk

CDK constructs for Stripe integration in AWS.

## Installation

```bash
npm install @toldyaonce/kx-stripe-cdk
```

## Usage

```typescript
import { StripeSecretConstruct } from '@toldyaonce/kx-stripe-cdk';
import * as cdk from 'aws-cdk-lib';

export class MyStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Stripe secret in Secrets Manager
    const stripeSecret = new StripeSecretConstruct(this, 'StripeSecret', {
      secretName: 'myapp/stripe-key',
      description: 'Stripe API key for payment processing'
    });

    // Grant Lambda read access
    stripeSecret.grantRead(myLambdaFunction);
    
    // Secret ARN available for environment variables
    myLambdaFunction.addEnvironment('STRIPE_SECRET_ARN', stripeSecret.secretArn);
  }
}
```

## Features

- Manages Stripe API keys in AWS Secrets Manager
- Easy IAM permission grants
- CloudFormation outputs for cross-stack references
- Support for both test and live keys
- Automatic secret rotation support

## API

### StripeSecretConstruct

Creates and manages a Stripe API key in Secrets Manager.

#### Props

- `secretName?: string` - Name for the secret (default: 'stripe-api-key')
- `description?: string` - Description for the secret
- `secretValue?: string` - API key value (dev only, use Console/CLI for prod)
- `existingSecretArn?: string` - Use existing secret instead of creating new
- `removalPolicy?: RemovalPolicy` - How to handle secret on stack deletion (default: RETAIN)

#### Methods

- `grantRead(grantee: IGrantable)` - Grant read access to the secret
- `grantWrite(grantee: IGrantable)` - Grant write access (for rotation)

#### Properties

- `secret: ISecret` - The Secrets Manager secret
- `secretArn: string` - ARN of the secret
- `secretName: string` - Name of the secret

## License

MIT

