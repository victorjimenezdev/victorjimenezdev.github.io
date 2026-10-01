import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  workProjects,
  personalProjects,
  professionalProjectCount,
} from '../src/data/projects.js';
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

test('professional sectors preserve the full documented project inventory without identities', () => {
  const inventory = JSON.parse(
    readFileSync(new URL('./project-counts.json', import.meta.url), 'utf8')
  );
  assert.equal(workProjects.length, 11);
  assert.equal(professionalProjectCount, 60);
  assert.equal(inventory.professional_records, 60);
  assert.deepEqual(
    Object.keys(inventory.sectors).sort(),
    workProjects.map((p) => p.id).sort()
  );
  const records = Object.values(inventory.sectors).flat();
  assert.equal(records.length, 60);
  assert.equal(new Set(records).size, 60);
  for (const project of workProjects) {
    assert.equal(project.type, 'professional');
    assert.deepEqual(Object.keys(project).sort(), [
      'description',
      'id',
      'projectCount',
      'tags',
      'title',
      'type',
    ]);
    assert.equal(project.projectCount, inventory.sectors[project.id].length);
    assert.ok(
      Number.isSafeInteger(project.projectCount) && project.projectCount > 0
    );
    assert.deepEqual(identityMatches(JSON.stringify(project)), []);
  }
  for (const filter of ['all', 'professional', 'personal']) {
    const matched = [...workProjects, ...personalProjects].filter(
      (p) => filter === 'all' || p.type === filter
    );
    assert.equal(
      matched.length,
      { all: 13, professional: 11, personal: 2 }[filter]
    );
  }
  for (const project of personalProjects) {
    assert.equal(project.type, 'personal');
    assert.equal(new URL(project.link).hostname, 'github.com');
  }
});

test('website positioning and metadata emphasize transferable engineering skills', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  const career = JSON.parse(readFileSync('cv/career.json', 'utf8'));
  const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
  assert.ok(title.includes(career.headline));
  assert.ok(!/Drupal|WordPress|CMS Architect/.test(title));
  const schema = JSON.parse(
    html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]
  );
  assert.equal(schema.jobTitle, career.headline);
  assert.match(
    schema.description,
    /60 professional project contributions across 11 sectors, delivered with project teams/
  );
  for (const name of [
    'description',
    'og:title',
    'og:description',
    'twitter:title',
    'twitter:description',
  ]) {
    const tag = [...html.matchAll(/<meta\b[^>]*>/g)].find(([tag]) =>
      new RegExp('(?:name|property)="' + name + '"').test(tag)
    )?.[0];
    assert.ok(tag, name);
    assert.ok(
      tag.includes('Product Engineer') || tag.includes('Full-stack web'),
      name
    );
  }
  const capabilities = [
    'Technical Leadership',
    'CI/CD',
    'Technical SEO',
    'Web Performance',
    'Security',
    'WCAG Accessibility',
    'API Integrations',
    'Workflow Automation',
  ];
  for (const capability of capabilities)
    assert.ok(schema.knowsAbout.includes(capability), capability);
  assert.ok(
    schema.knowsAbout.indexOf('Drupal') > schema.knowsAbout.indexOf('Security')
  );
  const profile = readFileSync('dist/llms.txt', 'utf8');
  assert.match(profile, /Senior Product Engineer/);
  assert.match(
    profile,
    /60 professional projects across 11 sectors as part of project teams/
  );
  for (const sector of workProjects) {
    assert.ok(
      profile.includes(sector.title + ': ' + sector.projectCount + ' projects')
    );
    assert.ok(
      html.includes(sector.title + ': ' + sector.projectCount + ' projects')
    );
  }
});

test('frontend profile assets do not name hiring companies', () => {
  const career = JSON.parse(readFileSync('cv/career.json', 'utf8'));
  const blocked = new Set([
    digest(career.current.employer.toLowerCase().replace(/[^a-z0-9]/g, '')),
  ]);
  for (const path of files('dist')) {
    if (/\.(html|js|css|json|xml|txt|svg|map|webmanifest)$/.test(path)) {
      assert.deepEqual(
        identityMatches(readFileSync(path, 'utf8'), blocked),
        [],
        path
      );
    }
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
