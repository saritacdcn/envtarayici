import { describe, it, expect } from 'vitest';
import { checkPublicExposure } from '../../src/core/rules/security.js';
import { KeyEntry } from '../../src/core/types.js';

function makeEntry(key: string, file = '.env.local', line = 5): KeyEntry {
  return { key, line, sourceFile: file, hasValue: true };
}

describe('security rules', () => {
  it('flags unambiguous secrets with client prefix as CRITICAL (PUBLIC_SECRET_EXPOSURE)', () => {
    const criticalKeys = [
      'NEXT_PUBLIC_STRIPE_SECRET_KEY',
      'VITE_DATABASE_URL',
      'NEXT_PUBLIC_USER_PASSWORD',
      'PUBLIC_PRIVATE_KEY',
      'EXPO_PUBLIC_SERVICE_ROLE_KEY',
      'NUXT_PUBLIC_CREDENTIALS_FILE',
      'NEXT_PUBLIC_JWT_AUTH_SECRET',
    ];

    for (const key of criticalKeys) {
      const finding = checkPublicExposure(makeEntry(key));
      expect(finding, `Expected ${key} to be CRITICAL`).not.toBeNull();
      expect(finding?.severity).toBe('CRITICAL');
      expect(finding?.code).toBe('PUBLIC_SECRET_EXPOSURE');
      expect(finding?.location?.file).toBe('.env.local');
      expect(finding?.location?.line).toBe(5);
    }
  });

  it('flags ambiguous tokens (KEY, TOKEN) with client prefix as WARNING (POTENTIAL_EXPOSURE)', () => {
    const ambiguousKeys = [
      'NEXT_PUBLIC_API_KEY',
      'VITE_MAPBOX_TOKEN',
      'PUBLIC_APP_KEY',
      'EXPO_PUBLIC_SENTRY_AUTH',
    ];

    for (const key of ambiguousKeys) {
      const finding = checkPublicExposure(makeEntry(key));
      expect(finding, `Expected ${key} to be WARNING`).not.toBeNull();
      expect(finding?.severity).toBe('WARNING');
      expect(finding?.code).toBe('POTENTIAL_EXPOSURE');
    }
  });

  it('allows legitimate public patterns (ANON_KEY, PUBLISHABLE_KEY, CLIENT_ID) without warnings', () => {
    const allowlistedKeys = [
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'VITE_FIREBASE_PUBLIC_KEY',
      'NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN',
      'NEXT_PUBLIC_AUTH0_CLIENT_ID',
    ];

    for (const key of allowlistedKeys) {
      const finding = checkPublicExposure(makeEntry(key));
      expect(finding, `Expected ${key} to be allowed`).toBeNull();
    }
  });

  it('ignores variables without client public prefixes even if they contain secret keywords', () => {
    const backendKeys = [
      'STRIPE_SECRET_KEY',
      'DATABASE_URL',
      'ADMIN_PASSWORD',
      'GITHUB_PRIVATE_KEY',
      'API_KEY',
    ];

    for (const key of backendKeys) {
      const finding = checkPublicExposure(makeEntry(key));
      expect(finding).toBeNull();
    }
  });
});
