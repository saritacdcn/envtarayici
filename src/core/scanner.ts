import { parse } from '@babel/parser';
import { readFile } from 'node:fs/promises';
import { CodeReference } from './types.js';
import { walkAst } from './utils/ast-walker.js';

/**
 * Checks if a MemberExpression or OptionalMemberExpression node represents `process.env`.
 */
function isProcessEnv(node: any): boolean {
  return (
    node &&
    (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') &&
    !node.computed &&
    node.object?.type === 'Identifier' &&
    node.object.name === 'process' &&
    node.property?.type === 'Identifier' &&
    node.property.name === 'env'
  );
}

/**
 * Checks if a MemberExpression or OptionalMemberExpression node represents `import.meta.env`.
 */
function isImportMetaEnv(node: any): boolean {
  return (
    node &&
    (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') &&
    !node.computed &&
    node.object?.type === 'MetaProperty' &&
    node.object.meta?.name === 'import' &&
    node.object.property?.name === 'meta' &&
    node.property?.type === 'Identifier' &&
    node.property.name === 'env'
  );
}

/**
 * Scans JavaScript/TypeScript source code using AST to identify environment variable references.
 * Comments, string literals, and documentation are inherently suppressed by AST parsing.
 */
export function scanSourceCode(content: string, filePath: string): CodeReference[] {
  // Fast pre-filter: skip AST parsing if content does not mention env tokens
  if (!content.includes('process.env') && !content.includes('import.meta.env')) {
    return [];
  }

  let ast: any;
  try {
    ast = parse(content, {
      sourceType: 'unambiguous',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    });
  } catch {
    // If parsing fails completely (e.g. invalid syntax), gracefully return empty list
    return [];
  }

  const references: CodeReference[] = [];

  walkAst(ast, (node) => {
    // 1. Direct Member Expression & Optional Chaining:
    // process.env.FOO, process.env?.FOO, process.env['FOO'], import.meta.env.FOO, import.meta.env?.FOO
    if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
      const isProc = isProcessEnv(node.object);
      const isMeta = isImportMetaEnv(node.object);

      if (isProc || isMeta) {
        const line = node.loc?.start?.line ?? 1;

        if (!node.computed && node.property?.type === 'Identifier') {
          // process.env.FOO or process.env?.FOO
          references.push({
            variableName: node.property.name,
            isDynamic: false,
            location: { file: filePath, line },
          });
        } else if (node.computed && node.property?.type === 'StringLiteral') {
          // process.env['FOO'] or process.env["FOO"]
          references.push({
            variableName: node.property.value,
            isDynamic: false,
            location: { file: filePath, line },
          });
        } else if (
          node.computed &&
          node.property?.type === 'TemplateLiteral' &&
          node.property.expressions.length === 0 &&
          node.property.quasis.length > 0
        ) {
          // process.env[`FOO`] (static template literal without expressions)
          references.push({
            variableName: node.property.quasis[0].value.raw,
            isDynamic: false,
            location: { file: filePath, line },
          });
        } else if (node.computed) {
          // process.env[dynamicKey] or process.env[`DB_${suffix}`]
          references.push({
            variableName: undefined,
            isDynamic: true,
            location: { file: filePath, line },
          });
        }
      }
    }

    // 2. Destructuring: const { FOO, BAR: renamed, [computed]: val, ...rest } = process.env
    if (node.type === 'VariableDeclarator' && node.id?.type === 'ObjectPattern') {
      const isProc = isProcessEnv(node.init);
      const isMeta = isImportMetaEnv(node.init);

      if (isProc || isMeta) {
        const line = node.loc?.start?.line ?? 1;

        for (const prop of node.id.properties) {
          if (prop.type === 'ObjectProperty') {
            if (!prop.computed && prop.key?.type === 'Identifier') {
              // const { FOO } = process.env
              references.push({
                variableName: prop.key.name,
                isDynamic: false,
                location: { file: filePath, line: prop.loc?.start?.line ?? line },
              });
            } else if (prop.computed && prop.key?.type === 'StringLiteral') {
              // const { ['FOO']: bar } = process.env
              references.push({
                variableName: prop.key.value,
                isDynamic: false,
                location: { file: filePath, line: prop.loc?.start?.line ?? line },
              });
            } else if (
              prop.computed &&
              prop.key?.type === 'TemplateLiteral' &&
              prop.key.expressions.length === 0 &&
              prop.key.quasis.length > 0
            ) {
              // const { [`FOO`]: bar } = process.env
              references.push({
                variableName: prop.key.quasis[0].value.raw,
                isDynamic: false,
                location: { file: filePath, line: prop.loc?.start?.line ?? line },
              });
            } else if (prop.computed) {
              // const { [dynamicKey]: bar } = process.env
              references.push({
                variableName: undefined,
                isDynamic: true,
                location: { file: filePath, line: prop.loc?.start?.line ?? line },
              });
            }
          } else if (prop.type === 'RestElement') {
            // const { ...rest } = process.env
            references.push({
              variableName: undefined,
              isDynamic: true,
              location: { file: filePath, line: prop.loc?.start?.line ?? line },
            });
          }
        }
      }
    }
  });

  return references;
}

/**
 * Scans a list of source files on disk.
 */
export async function scanSourceFiles(filePaths: string[]): Promise<CodeReference[]> {
  const allReferences: CodeReference[] = [];

  for (const filePath of filePaths) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const refs = scanSourceCode(content, filePath);
      allReferences.push(...refs);
    } catch {
      // Ignore unreadable files
    }
  }

  return allReferences;
}
