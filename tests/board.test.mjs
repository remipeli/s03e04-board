import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serve, launch, fakeApi, incident } from './helpers.mjs';

let server, browser;
before(async () => {
  server = await serve(process.env.BOARD_DIR ?? 'app');
  browser = await launch();
});
after(async () => {
  await browser.close();
  server.close();
});

const A = incident('INC-1', '2026-10-25T05:00:00.000Z');
const B = incident('INC-2', '2026-10-25T05:10:00.000Z');
const C = incident('INC-3', '2026-10-25T05:20:00.000Z');

test('SCHED-4512: loader shows on open and is gone once incidents load', async () => {
  const page = await browser.newPage();
  await fakeApi(page, () => [A], { delayMs: 800 });
  await page.goto(server.url);
  await page.getByTestId('loader').waitFor({ state: 'visible' });
  await page.getByTestId('incident-row').first().waitFor();
  assert.equal(await page.getByTestId('loader').count(), 0);
  await page.close();
});

test('SCHED-4511 + 4513: a new incident shows at the top without a reload', async () => {
  const page = await browser.newPage();
  const calls = await fakeApi(page, (n) => (n === 0 ? [B, A] : [C, B, A]));
  await page.goto(server.url);
  await page.getByTestId('incident-row').first().waitFor();
  assert.deepEqual(await page.getByTestId('incident-row').evaluateAll((r) => r.map((x) => x.dataset.id)), ['INC-2', 'INC-1']);
  await page.locator('[data-testid="incident-row"][data-id="INC-3"]').waitFor({ timeout: 4000 });
  assert.deepEqual(await page.getByTestId('incident-row').evaluateAll((r) => r.map((x) => x.dataset.id)), ['INC-3', 'INC-2', 'INC-1']);
  assert.ok(calls.incidents[1].searchParams.get('since'), 'the refresh passes the cursor');
  await page.close();
});

test('SCHED-4513: the board polls about every 2 seconds', async () => {
  const page = await browser.newPage();
  const calls = await fakeApi(page, () => [A]);
  await page.goto(server.url);
  await page.waitForTimeout(5000);
  assert.ok(calls.incidents.length >= 3 && calls.incidents.length <= 4, `polls in 5 s: ${calls.incidents.length}`);
  await page.close();
});

test('SCHED-4511: Ack acks that incident, and the mark survives the next refresh', async () => {
  const page = await browser.newPage();
  const calls = await fakeApi(page, () => [B, A]);
  await page.goto(server.url);
  const row = page.locator('[data-testid="incident-row"][data-id="INC-1"]');
  await row.getByTestId('ack').click();
  await row.getByTestId('acked').waitFor();
  assert.equal(calls.acks.length, 1);
  assert.equal(calls.acks[0].searchParams.get('id'), 'INC-1');
  assert.ok(calls.acks[0].searchParams.get('cursor'), 'the ack sends the latest cursor');
  const polls = calls.incidents.length;
  await page.waitForTimeout(2500);
  assert.ok(calls.incidents.length > polls, 'a refresh ran after the ack');
  assert.equal(await row.getByTestId('acked').count(), 1);
  assert.equal(await row.getByTestId('ack').count(), 0);
  await page.close();
});

test('SCHED-4514: Auckland and Berlin each see their own zone and order', async () => {
  const ilse = incident('INC-8024', '2026-10-24T03:11:00.000Z');
  const seen = {};
  for (const [name, timezoneId, locale] of [
    ['auckland', 'Pacific/Auckland', 'en-NZ'],
    ['berlin', 'Europe/Berlin', 'de-DE'],
  ]) {
    const context = await browser.newContext({ timezoneId, locale });
    const page = await context.newPage();
    await fakeApi(page, () => [ilse]);
    await page.goto(server.url);
    const time = page.getByTestId('incident-row').locator('time');
    await time.waitFor();
    seen[name] = await time.textContent();
    assert.equal(await time.getAttribute('datetime'), '2026-10-24T03:11:00.000Z');
    await context.close();
  }
  assert.match(seen.auckland, /^24\/10\/2026, 04:11\s?pm NZDT$/i, seen.auckland);
  assert.match(seen.berlin, /^24\.10\.2026, 05:11 (MESZ|GMT\+2)$/, seen.berlin);
});

test('empty state shows when there are no incidents', async () => {
  const page = await browser.newPage();
  await fakeApi(page, () => []);
  await page.goto(server.url);
  await page.getByTestId('empty').waitFor({ state: 'visible' });
  assert.equal(await page.getByTestId('incident-row').count(), 0);
  await page.close();
});
