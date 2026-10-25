import { fetchIncidents, ack } from './api.js';

const REFRESH_MS = 2000; // R4

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const error = document.querySelector('.error');

// R5: the viewer's own locale and time zone decide the zone and the day/month order.
const localTime = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

// One <li> per incident id, kept across refreshes so an ack mark survives the next render.
const rows = new Map();
const acked = new Map(); // id -> ackedAt

function cell(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function ackedMark(ackedAt) {
  const mark = document.createElement('span');
  mark.dataset.testid = 'acked';
  mark.className = 'acked';
  mark.textContent = 'acked';
  mark.title = ackedAt;
  return mark;
}

async function onAck(id, li, button) {
  button.disabled = true;
  try {
    const reply = await ack(id);
    acked.set(id, reply.ackedAt);
    button.replaceWith(ackedMark(reply.ackedAt));
    li.classList.add('is-acked');
  } catch (err) {
    button.disabled = false;
    showError(`Ack ${id} failed: ${err.message}`);
  }
}

function rowFor(incident) {
  let li = rows.get(incident.id);
  if (li) return li;
  li = document.createElement('li');
  li.dataset.testid = 'incident-row';
  li.dataset.id = incident.id;
  li.className = `row ${incident.severity}`;

  const time = document.createElement('time');
  time.dateTime = incident.openedAt; // full UTC value stays machine-readable
  time.title = incident.openedAt;
  time.textContent = localTime.format(new Date(incident.openedAt));

  li.append(
    cell('id', incident.id),
    cell('sev', incident.severity),
    cell('what', `${incident.service} · ${incident.region} · ${incident.summary}`),
    time,
  );

  if (acked.has(incident.id)) {
    li.append(ackedMark(acked.get(incident.id)));
    li.classList.add('is-acked');
  } else {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.testid = 'ack';
    button.textContent = 'Ack';
    button.addEventListener('click', () => onAck(incident.id, li, button));
    li.append(button);
  }

  rows.set(incident.id, li);
  return li;
}

// R1: the API answers newest first, so new incidents land at the top.
function render(incidents) {
  list.replaceChildren(...incidents.map(rowFor));
  empty.hidden = incidents.length > 0;
}

function showError(message) {
  error.textContent = message;
  error.hidden = false;
}

async function refresh() {
  try {
    const page = await fetchIncidents();
    render(page.incidents);
    loader.remove(); // R3: gone once incidents load
    error.hidden = true;
  } catch (err) {
    showError(`Could not load incidents: ${err.message}`);
  } finally {
    setTimeout(refresh, REFRESH_MS); // the next refresh starts after this one ends, so polls never overlap
  }
}

refresh();
