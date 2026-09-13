import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { defaultInput, defaultRules } from '../lib/build-advisor.ts';

// Compile these UI modules for server rendering; no browser or network is used.
const root = resolve('work/advisor-render-test');
for (const file of [
  'components/PartyAdvisor.tsx',
  'components/AdvisorIcon.tsx',
  'components/ZoneGuideLink.tsx',
  'components/LocalMapContext.tsx',
  'lib/zone-navigation.ts',
  'lib/zone-catalog.ts',
  'lib/party-advisor.ts',
  'lib/build-advisor.ts',
]) {
  let code = readFileSync(file, 'utf8').replace(
    /^import ['"].*\.css['"];?$/gm,
    '',
  );
  code = ts.transpileModule(code, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  code = code.replace(
    /from (['"])(\.\.?\/[^'"]+)\1/g,
    (_all, quote, path) =>
      `from ${quote}${path.endsWith('.json') ? path : path.replace(/\.(ts|tsx)$/, '') + '.js'}${quote}`,
  );
  const target = resolve(root, file.replace(/\.(ts|tsx)$/, '.js'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, code);
}
for (const file of [
  'build-advisor.json',
  'build-evidence.json',
  'party-advisor.json',
  'zone-catalog.json',
]) {
  mkdirSync(resolve(root, 'data'), { recursive: true });
  copyFileSync(resolve('data', file), resolve(root, 'data', file));
}
const { PartyZoneChart, PartyEditor } = await import(
  pathToFileURL(resolve(root, 'components/PartyAdvisor.js'))
);
const { default: ZoneGuideLink } = await import(
  pathToFileURL(resolve(root, 'components/ZoneGuideLink.js'))
);
const input = {
  ...defaultInput,
  tertiary: 'BRD',
  mode: 'group',
  buddy: ['MNK', 'CLR', 'ENC'],
  party: [
    ['WAR', 'CLR', 'ENC'],
    ['DRU', 'SHM', 'MAG'],
  ],
};
test('zone cards render four real trios and ten accessible coverage bars', () => {
  const html = renderToStaticMarkup(
    createElement(PartyZoneChart, {
      input,
      pack: defaultRules,
      zone: defaultRules.zones[0],
    }),
  );
  assert.equal((html.match(/class="ba-party-player /g) || []).length, 4);
  assert.equal((html.match(/role="meter"/g) || []).length, 10);
  assert(html.includes('4 of 4 players entered'));
  assert(html.includes('Zone target'));
  assert(html.includes('heuristic/inference'));
  assert(html.includes('Lowest coverage'));
});
test('party editor exposes all nine teammate class selectors and four player counts', () => {
  const html = renderToStaticMarkup(
    createElement(PartyEditor, {
      input,
      pack: defaultRules,
      onChange: () => {},
    }),
  );
  for (let player = 2; player <= 4; player++)
    for (let slot = 1; slot <= 3; slot++)
      assert(html.includes(`aria-label="Player ${player} class ${slot}"`));
  assert(html.includes('4 players'));
});
test('standalone guide action is a real encoded HTTPS link; embedded action keeps in-app navigation', () => {
  const link = renderToStaticMarkup(
    createElement(ZoneGuideLink, { zone: 'Castle Mistmoore' }),
  );
  assert(link.includes('target="_blank"'));
  assert(link.includes('rel="noopener noreferrer"'));
  assert(link.includes('?zone=Castle+Mistmoore#zone-guide'));
  const button = renderToStaticMarkup(
    createElement(ZoneGuideLink, {
      zone: 'Castle Mistmoore',
      onZone: () => {},
    }),
  );
  assert(button.startsWith('<button'));
  assert(!button.includes('href='));
});
