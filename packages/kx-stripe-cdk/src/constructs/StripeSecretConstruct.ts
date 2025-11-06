import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface StripeSecretConstructProps {
  /**
   * Name for the secret in Secrets Manager
   * @default 'stripe-api-key'
   */
  secretName?: string;
  
  /**
   * Description for the secret
   * @default 'Stripe API secret key'
   */
  description?: string;
  
  /**
   * Optional: Provide the Stripe secret key value directly
   * WARNING: Only use for development! Use AWS Console or CLI for production
   */
  secretValue?: string;
  
  /**
   * Optional: Use an existing secret ARN instead of creating new
   */
  existingSecretArn?: string;
  
  /**
   * Removal policy for the secret
   * @default RETAIN (recommended for production)
   */
  removalPolicy?: cdk.RemovalPolicy;
}

/**
 * CDK Construct for managing Stripe API keys in AWS Secrets Manager
 * 
 * Usage:
 * ```typescript
 * const stripeSecret = new StripeSecretConstruct(this, 'StripeSecret', {
 *   secretName: 'myapp/stripe-key',
 *   description: 'Stripe secret key for payment processing'
 * });
 * 
 * // Grant Lambda read access
 * stripeSecret.grantRead(myLambdaFunction);
 * ```
 */
export class StripeSecretConstruct extends Construct {
  public readonly secret: secretsmanager.ISecret;
  public readonly secretArn: string;
  public readonly secretName: string;

  constructor(scope: Construct, id: string, props: StripeSecretConstructProps = {}) {
    super(scope, id);

    const {
      secretName = 'stripe-api-key',
      description = 'Stripe API secret key',
      secretValue,
      existingSecretArn,
      removalPolicy = cdk.RemovalPolicy.RETAIN
    } = props;

    if (existingSecretArn) {
      // Use existing secret
      this.secret = secretsmanager.Secret.fromSecretCompleteArn(
        this,
        'ExistingSecret',
        existingSecretArn
      );
      this.secretArn = existingSecretArn;
      this.secretName = secretName;
    } else {
      // Create new secret
      if (secretValue) {
        // Value provided (development only)
        this.secret = new secretsmanager.Secret(this, 'Secret', {
          secretName,
          description,
          secretStringValue: cdk.SecretValue.unsafePlainText(secretValue),
          removalPolicy
        });
      } else {
        // Create empty secret (populate manually via Console/CLI)
        this.secret = new secretsmanager.Secret(this, 'Secret', {
          secretName,
          description: `${description} (populate via AWS Console or CLI)`,
          removalPolicy,
          generateSecretString: {
            secretStringTemplate: JSON.stringify({ apiKey: 'PLACEHOLDER' }),
            generateStringKey: 'placeholder'
          }
        });
        
        // Add warning in output
        new cdk.CfnOutput(this, 'SecretWarning', {
          value: 'IMPORTANT: Update this secret with your actual Stripe API key',
          description: `Secret ARN: ${this.secret.secretArn}`
        });
      }

      this.secretArn = this.secret.secretArn;
      this.secretName = this.secret.secretName;
    }

    // Output secret ARN for reference
    new cdk.CfnOutput(this, 'SecretArn', {
      value: this.secretArn,
      description: 'Stripe API Key Secret ARN',
      exportName: `${cdk.Stack.of(this).stackName}-StripeSecretArn`
    });
  }

  /**
   * Grant read access to the secret
   */
  public grantRead(grantee: iam.IGrantable): iam.Grant {
    return this.secret.grantRead(grantee);
  }

  /**
   * Grant write access to the secret (for rotation lambdas)
   */
  public grantWrite(grantee: iam.IGrantable): iam.Grant {
    return this.secret.grantWrite(grantee);
  }
}

