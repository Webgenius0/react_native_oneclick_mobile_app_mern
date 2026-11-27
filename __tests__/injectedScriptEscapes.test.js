/* eslint-disable no-new-func */
/**
 * Injected WebView scripts are written inside JS template literals. In a
 * template literal a single backslash before most regex characters is
 * silently dropped: `\s` becomes `s`, `\-` becomes `-`, `\$` becomes `$`.
 * The script still compiles, but every regex means something else.
 *
 * Example that broke Shein colour selection: in the add-to-cart snapshot,
 *   /^[:\-\s]+|[:\-\s]+$/  reached the page as  /^[:-s]+|[:-s]+$/
 * and `[:-s]` is a range covering A-Z and a-s, so "Pink", "Black", "Red"
 * were cleaned to "" and the app asked the user to select a colour.
 *
 * Regex escapes inside these templates must be doubled: `\\s`, `\\-`, `\\$`.
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
import { getProductOptionsBridge } from '../src/helpers/webview1';

const BACKSLASH = String.fromCharCode(92);
// Characters whose escape a template literal swallows or turns into something
// else (\b becomes a backspace character).
const REGEX_META = 'sdwSDWb.()/[]+*?|-$';

const parseFile = file =>
  parser.parse(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    sourceType: 'module',
    plugins: ['jsx'],
  });

const collectTemplates = file => {
  const templates = [];
  const walk = node => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'TemplateLiteral') templates.push(node);
    Object.keys(node).forEach(key => {
      if (key === 'loc') return;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    });
  };
  walk(parseFile(file).program);
  return templates;
};

// Source lines (in the file) where a single backslash precedes a regex char.
const swallowedEscapeLines = template => {
  const lines = new Set();
  template.quasis.forEach(q => {
    const raw = q.value.raw;
    let line = q.loc.start.line;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '\n') {
        line++;
        continue;
      }
      if (raw[i] !== BACKSLASH) continue;
      let end = i;
      while (end < raw.length && raw[end] === BACKSLASH) end++;
      if (end - i === 1 && REGEX_META.includes(raw[end])) lines.add(line);
      i = end - 1;
    }
  });
  return [...lines];
};

const cooked = template =>
  template.quasis.map(q => q.value.cooked).join('null');

const ADD_TO_CART_MARKER = 'window.__extractAndSendProductOptions(true)';

const findAddToCartSnapshot = () => {
  const match = collectTemplates('src/pages/Webview.js').find(t =>
    cooked(t).includes(ADD_TO_CART_MARKER),
  );
  if (!match) throw new Error('add-to-cart snapshot template not found');
  return match;
};

// Pull `var <name> = function ... { ... };` out of injected code, as the page
// would receive it, and return the function.
const extractFunction = (code, name) => {
  const start = code.indexOf(`var ${name} = function`);
  if (start === -1) throw new Error(`${name} not found`);
  const open = code.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}' && --depth === 0) {
      return new Function(`${code.slice(start, i + 1)}; return ${name};`)();
    }
  }
  throw new Error(`${name}: unbalanced braces`);
};

const COLOUR_NAMES = [
  'Pink',
  'Black',
  'Red',
  'Beige',
  'Khaki',
  'Apricot',
  'White',
  'Grey',
  'Navy Blue',
  'Dusty Pink',
  'Multicolor',
];

describe('injected option cleaner keeps colour names intact', () => {
  const sources = {
    'Webview.js add-to-cart snapshot': () => cooked(findAddToCartSnapshot()),
    'webview1.js options bridge': () => getProductOptionsBridge(''),
  };

  Object.entries(sources).forEach(([label, getCode]) => {
    it(label, () => {
      const cleanOptionValue = extractFunction(getCode(), 'cleanOptionValue');
      COLOUR_NAMES.forEach(name => {
        expect(cleanOptionValue(name)).toBe(name);
        expect(cleanOptionValue(`  ${name} `)).toBe(name);
      });
    });
  });
});

describe('injected templates: no swallowed regex escapes', () => {
  it('add-to-cart snapshot in Webview.js has none', () => {
    expect(swallowedEscapeLines(findAddToCartSnapshot())).toEqual([]);
  });

  // Known remaining cases, to be fixed in a separate pass. These ceilings may
  // only go down: lower them as lines are fixed, never raise them.
  const KNOWN_CEILING = {
    'src/pages/Webview.js': 8, // Shein currency bridge
    'src/helpers/webview1.js': 101, // title / price / options / snapshot / product-check bridges
  };

  Object.entries(KNOWN_CEILING).forEach(([file, ceiling]) => {
    it(`${file}: no new swallowed escapes (ceiling ${ceiling})`, () => {
      const total = collectTemplates(file).reduce(
        (sum, t) => sum + swallowedEscapeLines(t).length,
        0,
      );
      expect(total).toBeLessThanOrEqual(ceiling);
    });
  });
});
