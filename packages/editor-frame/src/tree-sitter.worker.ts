self.onmessage = (e: MessageEvent<{ code: string; requestId: number }>) => {
  const { code, requestId } = e.data;

  const symbols: { name: string; type: string }[] = [];
  const seen = new Set<string>();

  // Extract function definitions: type name(...) or return_type name(...)
  const funcRegex = /(?:^|\n)\s*(?:\w+(?:\s*<[^>]*>)?\s+|\*?\s*)(\w+)\s*\([^)]*\)\s*(?:const\s*)?(?:override\s*)?(?:final\s*)?(?:\{|;)/g;
  let match;
  while ((match = funcRegex.exec(code)) !== null) {
    const name = match[1];
    if (name !== 'if' && name !== 'while' && name !== 'for' && name !== 'switch' && name !== 'catch' && !seen.has(name)) {
      seen.add(name);
      symbols.push({ name, type: 'function' });
    }
  }

  // Extract variable declarations: type name[;=]
  const varRegex = /(?:^|\n)\s*(?:\w+(?:\s*<[^>]*>)?(?:\s*[*&])?\s+)(\w+)\s*(?:[;=]|$)/g;
  while ((match = varRegex.exec(code)) !== null) {
    const name = match[1];
    if (!seen.has(name) && !['if', 'while', 'for', 'switch', 'return', 'case', 'break', 'continue', 'auto', 'const', 'int', 'long', 'double', 'float', 'char', 'bool', 'void', 'string', 'size_t', 'using', 'namespace', 'template', 'typedef', 'struct', 'class', 'enum', 'static', 'virtual', 'mutable', 'explicit'].includes(name)) {
      seen.add(name);
      symbols.push({ name, type: 'variable' });
    }
  }

  self.postMessage({ requestId, symbols });
};
