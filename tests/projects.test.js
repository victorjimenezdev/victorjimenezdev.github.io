import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { workProjects, personalProjects } from '../src/data/projects.js';
const identities = JSON.parse(
  readFileSync(new URL('./client-identities.json', import.meta.url), 'utf8')
);

const digest = (text) => createHash('sha256').update(text).digest('hex');

function identityMatches(text, blocked = new Set(identities)) {
  let decoded = text;
  for (let pass = 0; pass < 3; pass += 1) {
    decoded = decoded.replace(/(?:%[0-9a-f]{2})+/gi, (value) => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    });
  }
  decoded = decoded
    .replace(/\b(?:radial|linear|conic)-gradient\s*\(/g, 'gradient(')
    .replace(/(<\/?)(?:radial|linear)Gradient(?=[\s>])/g, '$1gradient')
    .replace(/\\u([0-9a-f]{4})/gi, (_match, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(x[0-9a-f]+|\d+);?/gi, (_match, number) =>
      String.fromCodePoint(
        Math.min(
          0x10ffff,
          number[0].toLowerCase() === 'x'
            ? parseInt(number.slice(1), 16)
            : Number(number)
        )
      )
    )
    .replace(/&(amp|quot|apos|lt|gt);/gi, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
  const words = decoded.toLowerCase().match(/[a-z0-9]+/g) || [];
  const matches = new Set();
  for (let start = 0; start < words.length; start += 1) {
    let normalized = '';
    for (
      let width = 1;
      width <= 8 && start + width <= words.length;
      width += 1
    ) {
      normalized += words[start + width - 1];
      const hash = digest(normalized);
      if (blocked.has(hash)) matches.add(hash);
    }
  }
  return [...matches];
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

test('professional records expose only generic contributions and platform categories', () => {
  assert.equal(workProjects.length, 8);
  for (const project of workProjects) {
    assert.equal(project.type, 'professional');
    assert.deepEqual(Object.keys(project).sort(), [
      'categories',
      'description',
      'id',
      'tags',
      'title',
      'type',
    ]);
    assert.deepEqual(identityMatches(JSON.stringify(project)), []);
  }
  const projects = [...workProjects, ...personalProjects];
  assert.deepEqual(
    Object.fromEntries(
      ['all', 'drupal', 'wordpress', 'personal'].map((filter) => [
        filter,
        projects.filter(
          (p) =>
            filter === 'all' ||
            (filter === 'personal'
              ? p.type === 'personal'
              : p.categories.includes(filter))
        ).length,
      ])
    ),
    { all: 10, drupal: 6, wordpress: 4, personal: 2 }
  );
  for (const project of personalProjects) {
    assert.equal(project.type, 'personal');
    assert.equal(new URL(project.link).hostname, 'github.com');
  }
});

test('privacy matcher detects encoded, split and compact synthetic identities', () => {
  const blocked = new Set([digest('syntheticcustomer')]);
  for (const value of [
    'Synthetic Customer',
    'SyntheticCustomer',
    'synthetic-customer',
    'synthetic%20customer',
    'synthetic&#32;customer',
    'synthetic\\u0020customer',
    'https://syntheticcustomer.example/',
    'images/synthetic-customer-800.webp',
  ]) {
    assert.equal(identityMatches(value, blocked).length, 1, value);
  }
  assert.deepEqual(identityMatches('Generic CMS project', blocked), []);
  assert.deepEqual(identityMatches('background:radial-gradient(red,blue)'), []);
  assert.deepEqual(identityMatches('<radialGradient id="internal"/>'), []);
});

test('the shipped build and public filenames contain no known professional-client identities', () => {
  for (const path of files('dist')) {
    assert.deepEqual(identityMatches(path), [], `filename ${path}`);
    if (/\.(html|js|css|json|xml|txt|svg|map|webmanifest)$/.test(path)) {
      assert.deepEqual(
        identityMatches(readFileSync(path, 'utf8')),
        [],
        `content ${path}`
      );
    }
  }
  assert.equal(
    files('dist').some((path) => /images\/(case|projects)\//.test(path)),
    false
  );
});
