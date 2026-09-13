import { describe, it, expect } from 'vitest';
import { extractEnvKeys } from '../../src/core/extractor.js';

describe('extractEnvKeys', () => {
  it('extracts basic keys and line numbers without storing values', () => {
    const content = `
# System Config
PORT=3000
DATABASE_URL="postgres://user:secretpass@localhost:5432/mydb"
EMPTY_VAR=
QUOTED_EMPTY=""
SINGLE_QUOTED_EMPTY=''
`;
    const result = extractEnvKeys(content, '.env');

    expect(result.size).toBe(5);

    const port = result.get('PORT');
    expect(port).toEqual({
      key: 'PORT',
      line: 3,
      sourceFile: '.env',
      hasValue: true,
    });
    // Ensure value string does not exist on the object
    expect((port as any).value).toBeUndefined();

    const db = result.get('DATABASE_URL');
    expect(db).toEqual({
      key: 'DATABASE_URL',
      line: 4,
      sourceFile: '.env',
      hasValue: true,
    });
    expect((db as any).value).toBeUndefined();

    const empty = result.get('EMPTY_VAR');
    expect(empty).toEqual({
      key: 'EMPTY_VAR',
      line: 5,
      sourceFile: '.env',
      hasValue: false,
    });

    const quotedEmpty = result.get('QUOTED_EMPTY');
    expect(quotedEmpty?.hasValue).toBe(false);

    const singleQuotedEmpty = result.get('SINGLE_QUOTED_EMPTY');
    expect(singleQuotedEmpty?.hasValue).toBe(false);
  });

  it('handles export prefix and spaces around equals', () => {
    const content = `
export API_KEY=abc123xyz
export   SPACED_KEY = "spaced value"
`;
    const result = extractEnvKeys(content, '.env.local');

    expect(result.get('API_KEY')).toEqual({
      key: 'API_KEY',
      line: 2,
      sourceFile: '.env.local',
      hasValue: true,
    });

    expect(result.get('SPACED_KEY')).toEqual({
      key: 'SPACED_KEY',
      line: 3,
      sourceFile: '.env.local',
      hasValue: true,
    });
  });

  it('handles multiline strings and ignores pseudo-keys inside quotes', () => {
    const content = `
RSA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
FAKE_KEY=inside_multiline
MIIEowIBAAKCAQEA0...
-----END RSA PRIVATE KEY-----"
AFTER_MULTILINE=valid
`;
    const result = extractEnvKeys(content, '.env');

    expect(result.size).toBe(2);
    expect(result.get('RSA_PRIVATE_KEY')).toEqual({
      key: 'RSA_PRIVATE_KEY',
      line: 2,
      sourceFile: '.env',
      hasValue: true,
    });
    expect(result.has('FAKE_KEY')).toBe(false);
    expect(result.get('AFTER_MULTILINE')).toEqual({
      key: 'AFTER_MULTILINE',
      line: 6,
      sourceFile: '.env',
      hasValue: true,
    });
  });

  it('handles values containing equals signs and URLs', () => {
    const content = 'COMPLEX_URL=https://api.example.com/v1?token=123&client=web';
    const result = extractEnvKeys(content, '.env');

    expect(result.get('COMPLEX_URL')).toEqual({
      key: 'COMPLEX_URL',
      line: 1,
      sourceFile: '.env',
      hasValue: true,
    });
  });

  it('handles Windows CRLF line endings correctly', () => {
    const content = 'VAR_ONE=1\r\nVAR_TWO=2\r\n';
    const result = extractEnvKeys(content, '.env');

    expect(result.get('VAR_ONE')?.line).toBe(1);
    expect(result.get('VAR_TWO')?.line).toBe(2);
  });

  it('ignores comment lines and inline comments', () => {
    const content = `
# Full line comment
FOO=bar # inline comment
# Another comment
BAZ=qux
`;
    const result = extractEnvKeys(content, '.env');
    expect(result.size).toBe(2);
    expect(result.has('FOO')).toBe(true);
    expect(result.has('BAZ')).toBe(true);
  });
});
