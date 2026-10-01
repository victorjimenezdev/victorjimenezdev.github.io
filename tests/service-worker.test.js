import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
  new URL('../public/sw.js', import.meta.url),
  'utf8'
);

function harness(fetcher = async () => new Response('current CV')) {
  const handlers = new Map();
  const store = new Map();
  const current = source.match(/const CACHE = '([^']+)'/)[1];
  const stores = new Map([[current, store]]);
  const names = new Set(['victor-portfolio-v4', 'unrelated-app']);
  vm.runInNewContext(source, {
    URL,
    Response,
    fetch: fetcher,
    caches: {
      open: async (name) => {
        names.add(name);
        if (!stores.has(name)) stores.set(name, new Map());
        const values = stores.get(name);
        return {
          match: async (request) => values.get(request.url)?.clone(),
          put: async (request, response) => values.set(request.url, response),
        };
      },
      keys: async () => [...names],
      delete: async (name) => {
        stores.delete(name);
        return names.delete(name);
      },
    },
    self: {
      location: { origin: 'https://portfolio.test' },
      clients: { claim: async () => {} },
      skipWaiting: () => {},
      addEventListener: (name, handler) => handlers.set(name, handler),
    },
  });
  return {
    names,
    handlers,
    store,
    stores,
    request(path = '/Victor_Jimenez_CV.pdf', method = 'GET') {
      const request = {
        url: `https://portfolio.test${path}`,
        method,
        mode: 'cors',
      };
      let response;
      handlers.get('fetch')({
        request,
        respondWith: (value) => {
          response = value;
        },
      });
      return response;
    },
  };
}

test('cached CV is replaced by current network bytes with HTTP cache disabled', async () => {
  let options;
  const worker = harness(async (_request, config) => {
    options = config;
    return new Response('current CV');
  });
  worker.store.set(
    'https://portfolio.test/Victor_Jimenez_CV.pdf',
    new Response('old CV')
  );
  assert.equal(await (await worker.request()).text(), 'current CV');
  assert.equal(options.cache, 'no-store');
  assert.equal(
    await worker.store
      .get('https://portfolio.test/Victor_Jimenez_CV.pdf')
      .text(),
    'current CV'
  );
});

test('network failure serves the previously refreshed CV offline', async () => {
  const worker = harness(async () => {
    throw new TypeError('offline');
  });
  worker.store.set(
    'https://portfolio.test/victorjimenezcv.pdf',
    new Response('saved CV')
  );
  assert.equal(
    await (await worker.request('/victorjimenezcv.pdf')).text(),
    'saved CV'
  );
});

test('an uncached offline CV request fails rather than fabricating a document', async () => {
  const worker = harness(async () => {
    throw new TypeError('offline');
  });
  await assert.rejects(worker.request(), /offline/);
});

test('HTTP failure does not replace a cached CV with an error page', async () => {
  const worker = harness(
    async () => new Response('unavailable', { status: 503 })
  );
  worker.store.set(
    'https://portfolio.test/Victor_Jimenez_CV.pdf',
    new Response('saved CV')
  );
  assert.equal(await (await worker.request()).text(), 'saved CV');
});

test('activation removes only obsolete portfolio caches', async () => {
  const worker = harness();
  let complete;
  worker.handlers.get('activate')({
    waitUntil: (value) => {
      complete = value;
    },
  });
  await complete;
  assert.deepEqual([...worker.names], ['unrelated-app']);
});

test('non-GET requests remain outside the service worker cache', () => {
  assert.equal(harness().request('/Victor_Jimenez_CV.pdf', 'POST'), undefined);
});

test('development modules and hot-reload clients always reach the dev server', () => {
  const worker = harness();
  for (const path of [
    '/src/main.js',
    '/src/style.css?t=123',
    '/@vite/client',
    '/node_modules/.vite/deps/example.js',
  ]) {
    assert.equal(worker.request(path), undefined);
  }
});

test('upgrade removes retired client-image caches and never serves their bytes', async () => {
  let networkCalls = 0;
  const worker = harness(async () => {
    networkCalls += 1;
    return new Response('network');
  });
  const path = '/images/case/synthetic-client-800.webp';
  const url = `https://portfolio.test${path}`;
  worker.names.add('victor-portfolio-v6');
  worker.stores.set(
    'victor-portfolio-v6',
    new Map([[url, new Response('retired image')]])
  );
  worker.stores.set(
    'unrelated-app',
    new Map([['saved', new Response('unrelated data')]])
  );
  worker.store.set(url, new Response('retired image'));
  let complete;
  worker.handlers.get('activate')({
    waitUntil: (value) => {
      complete = value;
    },
  });
  await complete;
  assert.equal(worker.stores.has('victor-portfolio-v6'), false);
  assert.equal(
    await worker.stores.get('unrelated-app').get('saved').text(),
    'unrelated data'
  );
  for (const retired of [path, '/images/projects/synthetic-client.jpg']) {
    const response = await worker.request(retired);
    assert.equal(response.status, 410);
    assert.equal(await response.text(), '');
  }
  assert.equal(networkCalls, 0);
});
