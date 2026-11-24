/**
 * Injected WebView scripts are written as JS template literals, so a regex
 * like /[ \t\r\n]/ turns into a literal newline inside the injected code and
 * the whole script fails with a SyntaxError (no price / image is extracted).
 * This test compiles every large template literal exactly as the WebView
 * would receive it.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const parser = require('@babel/parser');

const FILES = ['src/pages/Webview.js', 'src/helpers/webview1.js'];

const collectInjectedScripts = file => {
  const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const ast = parser.parse(src, {sourceType: 'module', plugins: ['jsx']});
  const scripts = [];
  const walk = node => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'TemplateLiteral') {
      let code = '';
      node.quasis.forEach((q, i) => {
        code += q.value.cooked;
        if (i < node.expressions.length) code += 'null';
      });
      if (code.length > 500) scripts.push({line: node.loc.start.line, code});
    }
    Object.keys(node).forEach(key => {
      if (key === 'loc') return;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    });
  };
  walk(ast.program);
  return scripts;
};

describe('injected WebView scripts', () => {
  FILES.forEach(file => {
    collectInjectedScripts(file).forEach(({line, code}) => {
      it(`${file}:${line} compiles`, () => {
        expect(() => new vm.Script(code)).not.toThrow();
      });
    });
  });
});
