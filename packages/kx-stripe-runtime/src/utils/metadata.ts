/**
 * Standard metadata keys for multi-tenant tracking
 */
export interface StandardMetadata {
  tenantId?: string;
  userId?: string;
  rewardId?: string;
  redemptionId?: string;
  points?: string;
  environment?: 'test' | 'production';
  source?: string;
  [key: string]: string | undefined;
}

/**
 * Create standardized metadata object for Stripe operations
 * Ensures consistent tracking across all Stripe resources
 * 
 * @param metadata - Metadata to include
 * @returns Sanitized metadata object (Stripe has limits)
 * 
 * @example
 * ```typescript
 * const metadata = createMetadata({
 *   tenantId: 'tenant_123',
 *   userId: 'user_456',
 *   redemptionId: 'redemption_789',
 *   points: '500'
 * });
 * ```
 */
export function createMetadata(metadata: StandardMetadata): Record<string, string> {
  // Filter out undefined values
  const filtered: Record<string, string> = {};
  
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Stripe metadata values must be strings
      filtered[key] = String(value);
    }
  });
  
  // Validate Stripe limits
  // - Max 50 keys
  // - Key names max 40 characters
  // - Values max 500 characters
  const keys = Object.keys(filtered);
  
  if (keys.length > 50) {
    console.warn(`⚠️ Metadata has ${keys.length} keys, Stripe max is 50. Truncating...`);
    return Object.fromEntries(Object.entries(filtered).slice(0, 50));
  }
  
  // Truncate long keys/values
  const sanitized: Record<string, string> = {};
  keys.forEach(key => {
    const sanitizedKey = key.length > 40 ? key.substring(0, 40) : key;
    const sanitizedValue = filtered[key].length > 500 
      ? filtered[key].substring(0, 500) 
      : filtered[key];
    
    sanitized[sanitizedKey] = sanitizedValue;
  });
  
  return sanitized;
}

/**
 * Extract tenant ID from metadata
 */
export function extractTenantId(metadata?: Record<string, any>): string | null {
  if (!metadata) return null;
  return metadata.tenantId || metadata.tenant_id || null;
}

/**
 * Extract user ID from metadata
 */
export function extractUserId(metadata?: Record<string, any>): string | null {
  if (!metadata) return null;
  return metadata.userId || metadata.user_id || null;
}

/**
 * Merge metadata objects (later values override earlier)
 */
export function mergeMetadata(
  ...metadataObjects: (Record<string, string> | undefined)[]
): Record<string, string> {
  const merged: Record<string, string> = {};
  
  metadataObjects.forEach(meta => {
    if (meta) {
      Object.assign(merged, meta);
    }
  });
  
  return createMetadata(merged);
}

