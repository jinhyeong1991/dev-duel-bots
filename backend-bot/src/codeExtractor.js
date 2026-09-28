const CODE_FENCE_RE = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;

const EXTENSION_MAP = {
  html: 'html',
  css: 'css',
  javascript: 'js',
  js: 'js',
  jsx: 'jsx',
  typescript: 'ts',
  ts: 'ts',
  json: 'json',
  python: 'py',
  py: 'py',
  bash: 'sh',
  sh: 'sh',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  markdown: 'md',
  md: 'md',
};

function extractCodeBlocks(text) {
  const blocks = [];
  let match;
  while ((match = CODE_FENCE_RE.exec(text)) !== null) {
    const lang = match[1] ? match[1].toLowerCase() : null;
    blocks.push({ lang, code: match[2].trim() });
  }
  return blocks;
}

function extensionForLang(lang) {
  if (!lang) return 'txt';
  return EXTENSION_MAP[lang.toLowerCase()] || 'txt';
}

function buildExportFiles(answer) {
  const blocks = extractCodeBlocks(answer);
  if (blocks.length === 0) {
    return [{ name: 'result.md', content: answer }];
  }
  if (blocks.length === 1) {
    return [{ name: `result.${extensionForLang(blocks[0].lang)}`, content: blocks[0].code }];
  }
  return blocks.map((block, i) => ({
    name: `result-${i + 1}.${extensionForLang(block.lang)}`,
    content: block.code,
  }));
}

module.exports = { extractCodeBlocks, extensionForLang, buildExportFiles };
