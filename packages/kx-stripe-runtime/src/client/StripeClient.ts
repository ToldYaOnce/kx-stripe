import Stripe from 'stripe';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Cold start optimization: Initialize AWS clients outside handler
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Cache for Stripe client instance (persists across Lambda invocations)
let cachedStripeClient: Stripe | null = null;
let cachedSecretArn: string | null = null;

/**
 * Get or create a cached Stripe client instance
 * 
 * This function automatically fetches the Stripe API key from Secrets Manager
 * and caches both the key and the Stripe client for subsequent invocations.
 * 
 * @param secretArn - ARN of the secret containing the Stripe API key
 * @param options - Optional Stripe configuration
 * @returns Stripe client instance
 * 
 * @example
 * ```typescript
 * const stripe = await StripeClient.getInstance(process.env.STRIPE_SECRET_ARN!);
 * const customer = await stripe.customers.create({ email: 'test@example.com' });
 * ```
 */
export async function getInstance(
  secretArn: string,
  options?: Stripe.StripeConfig
): Promise<Stripe> {
  // Return cached client if secret ARN matches
  if (cachedStripeClient && cachedSecretArn === secretArn) {
    console.log('✅ Using cached Stripe client');
    return cachedStripeClient;
  }

  console.log('🔑 Fetching Stripe API key from Secrets Manager...');
  
  try {
    // Fetch secret from Secrets Manager
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: secretArn })
    );

    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    // Parse secret (support both plain string and JSON format)
    let apiKey: string;
    try {
      const parsed = JSON.parse(response.SecretString);
      apiKey = parsed.apiKey || parsed.STRIPE_SECRET_KEY || parsed.key;
    } catch {
      // Assume plain string format
      apiKey = response.SecretString;
    }

    if (!apiKey || !apiKey.startsWith('sk_')) {
      throw new Error('Invalid Stripe API key format (must start with sk_)');
    }

    // Create and cache Stripe client
    cachedStripeClient = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
      ...options
    });

    cachedSecretArn = secretArn;
    
    console.log('✅ Stripe client initialized and cached');
    return cachedStripeClient;

  } catch (error) {
    console.error('❌ Failed to initialize Stripe client:', error);
    throw new Error(`Failed to fetch Stripe API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a Stripe client with a provided API key (bypasses Secrets Manager)
 * Useful for testing or when the key is already available
 * 
 * @param apiKey - Stripe API key
 * @param options - Optional Stripe configuration
 * @returns Stripe client instance
 */
export function createClient(
  apiKey: string,
  options?: Stripe.StripeConfig
): Stripe {
  if (!apiKey.startsWith('sk_')) {
    throw new Error('Invalid Stripe API key format (must start with sk_)');
  }

  return new Stripe(apiKey, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
    ...options
  });
}

/**
 * Clear the cached Stripe client (useful for testing)
 */
export function clearCache(): void {
  cachedStripeClient = null;
  cachedSecretArn = null;
  console.log('🗑️ Stripe client cache cleared');
}

