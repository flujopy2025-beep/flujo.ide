/**
 * Language detection utility for CodeMirror mode selection.
 * Maps file extensions to CodeMirror language identifiers.
 */

const extensionMap: Record<string, string> = {
  // JavaScript / TypeScript
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  less: 'css',

  // Data formats
  json: 'json',
  xml: 'html',
  yaml: 'yaml',
  yml: 'yaml',

  // Markdown
  md: 'markdown',
  mdx: 'markdown',

  // Python
  py: 'python',
  pyw: 'python',

  // Other
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  txt: 'text',
};

/**
 * Detect the language from a file extension for CodeMirror mode selection.
 */
export function detectLanguage(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) {
    return 'text';
  }
  const extension = parts[parts.length - 1].toLowerCase();
  return extensionMap[extension] || 'text';
}

/**
 * Get a display-friendly language name.
 */
export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    markdown: 'Markdown',
    python: 'Python',
    sql: 'SQL',
    shell: 'Shell',
    yaml: 'YAML',
    text: 'Plain Text',
  };
  return displayNames[language] || language;
}
