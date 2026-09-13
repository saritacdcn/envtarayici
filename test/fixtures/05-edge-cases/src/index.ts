// 1. Commented reference - should be ignored by AST
// const x = process.env.COMMENTED_KEY;

/*
 * Block comment reference - should be ignored by AST
 * process.env.BLOCK_COMMENTED_KEY
 */

// 2. String literal - should be ignored by AST
export const docString = "Set process.env.STRING_LITERAL_KEY in your env";

// 3. Destructuring - should be detected
export const { DESTRUCTURED_KEY } = process.env;

// 4. Bracket access - should be detected
export const bracket = process.env['BRACKET_KEY'];

// 5. import.meta.env - should be detected
export const appName = import.meta.env.VITE_APP_NAME;

// 6. Dynamic access - should be reported as DYNAMIC_ACCESS (INFO)
const dynamicKey = 'COMPUTED';
export const dynamicVal = process.env[dynamicKey];
