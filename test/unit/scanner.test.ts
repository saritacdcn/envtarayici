import { describe, it, expect } from 'vitest';
import { scanSourceCode } from '../../src/core/scanner.js';

describe('scanSourceCode', () => {
  it('detects standard process.env.VAR_NAME', () => {
    const code = `
      const port = process.env.PORT || 3000;
      const host = process.env.HOST;
    `;
    const refs = scanSourceCode(code, 'server.ts');

    expect(refs).toHaveLength(2);
    expect(refs[0]).toEqual({
      variableName: 'PORT',
      isDynamic: false,
      location: { file: 'server.ts', line: 2 },
    });
    expect(refs[1]).toEqual({
      variableName: 'HOST',
      isDynamic: false,
      location: { file: 'server.ts', line: 3 },
    });
  });

  it('detects bracket access process.env["VAR_NAME"] and single quotes', () => {
    const code = `
      const a = process.env['API_KEY'];
      const b = process.env["DATABASE_URL"];
    `;
    const refs = scanSourceCode(code, 'config.js');

    expect(refs).toHaveLength(2);
    expect(refs[0].variableName).toBe('API_KEY');
    expect(refs[1].variableName).toBe('DATABASE_URL');
  });

  it('detects import.meta.env references for Vite/Astro', () => {
    const code = `
      const apiUrl = import.meta.env.VITE_API_URL;
      const mode = import.meta.env['MODE'];
    `;
    const refs = scanSourceCode(code, 'src/api.ts');

    expect(refs).toHaveLength(2);
    expect(refs[0]).toEqual({
      variableName: 'VITE_API_URL',
      isDynamic: false,
      location: { file: 'src/api.ts', line: 2 },
    });
    expect(refs[1]).toEqual({
      variableName: 'MODE',
      isDynamic: false,
      location: { file: 'src/api.ts', line: 3 },
    });
  });

  it('detects destructuring from process.env and import.meta.env', () => {
    const code = `
      const { DB_HOST, DB_PORT: port, ['DB_USER']: user } = process.env;
      const { VITE_CLIENT_ID } = import.meta.env;
    `;
    const refs = scanSourceCode(code, 'db.ts');

    expect(refs).toHaveLength(4);
    const varNames = refs.map((r) => r.variableName);
    expect(varNames).toContain('DB_HOST');
    expect(varNames).toContain('DB_PORT');
    expect(varNames).toContain('DB_USER');
    expect(varNames).toContain('VITE_CLIENT_ID');
  });

  it('ignores references inside single-line and multi-line comments', () => {
    const code = `
      // process.env.COMMENTED_VAR = 'test';
      /*
       * process.env.BLOCK_COMMENTED_VAR
       * import.meta.env.COMMENTED_META
       */
      const real = process.env.REAL_VAR;
    `;
    const refs = scanSourceCode(code, 'comments.ts');

    expect(refs).toHaveLength(1);
    expect(refs[0].variableName).toBe('REAL_VAR');
  });

  it('ignores references inside string literals and template literals', () => {
    const code = `
      const message = "Please configure process.env.STRING_LITERAL in .env";
      const tmpl = \`Missing \${'foo'} process.env.TEMPLATE_LITERAL\`;
      const actual = process.env.ACTUAL_VAR;
    `;
    const refs = scanSourceCode(code, 'strings.ts');

    expect(refs).toHaveLength(1);
    expect(refs[0].variableName).toBe('ACTUAL_VAR');
  });

  it('identifies dynamic property access as DYNAMIC_ACCESS (isDynamic: true)', () => {
    const code = `
      const key = getEnvKey();
      const val1 = process.env[key];
      const { [computedKey]: val2, ...rest } = process.env;
    `;
    const refs = scanSourceCode(code, 'dynamic.ts');

    expect(refs).toHaveLength(3);
    for (const ref of refs) {
      expect(ref.isDynamic).toBe(true);
      expect(ref.variableName).toBeUndefined();
    }
  });

  it('parses TSX/JSX syntax properly without errors', () => {
    const code = `
      export function Header() {
        return <div title={process.env.NEXT_PUBLIC_APP_TITLE}>Hello</div>;
      }
    `;
    const refs = scanSourceCode(code, 'Header.tsx');

    expect(refs).toHaveLength(1);
    expect(refs[0].variableName).toBe('NEXT_PUBLIC_APP_TITLE');
  });

  it('skips parsing completely when file does not contain env tokens (fast pre-filter)', () => {
    const code = `
      export function add(a: number, b: number) {
        return a + b;
      }
    `;
    const refs = scanSourceCode(code, 'math.ts');
    expect(refs).toHaveLength(0);
  });
});
