/**
 * Lightweight, zero-dependency recursive AST walker for @babel/parser AST nodes.
 * Avoids the heavy footprint of @babel/traverse.
 */
export function walkAst(node: any, visitor: (node: any) => void): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  visitor(node);

  for (const key of Object.keys(node)) {
    // Avoid traversing comments or locations as separate AST nodes
    if (key === 'loc' || key === 'comments' || key === 'tokens') {
      continue;
    }

    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && typeof item.type === 'string') {
          walkAst(item, visitor);
        }
      }
    } else if (child && typeof child === 'object' && typeof child.type === 'string') {
      walkAst(child, visitor);
    }
  }
}
