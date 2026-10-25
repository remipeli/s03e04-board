// Shared test setup: a static server for app/ (or dist/) and a fake incident API, so the tests never
// touch the course's night.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

export async function serve(dir = 'app') {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    try {
      const body = await readFile(join(dir, path === '/' ? 'index.html' : path));
      res.writeHead(200, { 'content-type': TYPES[extname(path) || '.html'] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  return { url: `http://localhost:${server.address().port}/`, close: () => server.close() };
}

// PW_CHROMIUM points at a browser already on the machine when the pinned one is not installed.
export const launch = () => chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

export function incident(id, openedAt, extra = {}) {
  return { id, service: 'booking-api', region: 'eu-west', summary: `summary ${id}`, severity: 'sev2', openedAt, ...extra };
}

/** Fakes the incident API on a page. `pages` is called once per poll with the poll number (0-based). */
export async function fakeApi(page, pages, { delayMs = 0 } = {}) {
  const calls = { incidents: [], acks: [] };
  await page.route('**/challenges/show-me-when/api/incidents?*', async (route) => {
    const n = calls.incidents.length;
    calls.incidents.push(new URL(route.request().url()));
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    const incidents = pages(n);
    await route.fulfill({ json: { updatedAt: new Date().toISOString(), incidents, cursor: `c${n + 1}` } });
  });
  await page.route('**/challenges/show-me-when/api/ack?*', async (route) => {
    const url = new URL(route.request().url());
    calls.acks.push(url);
    const id = url.searchParams.get('id');
    await route.fulfill({ json: { id, ackedAt: new Date().toISOString(), receipt: `r-${id}` } });
  });
  return calls;
}
