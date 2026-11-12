#!/usr/bin/env node
/**
 * Generates assets/contributions.svg — a brand-colored GitHub contribution
 * graph we own, so the profile never depends on a public card service.
 *
 * Data: https://github-contributions-api.jogruber.de (public, no token).
 * Run:  node scripts/contribution-graph.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const USER = 'YussefMo';
const API = `https://github-contributions-api.jogruber.de/v4/${USER}?y=last`;
const OUT = path.resolve('assets/contributions.svg');

const BRAND = {
  bg: '#0A0A0C',
  surface: '#141418',
  raised: '#1C1C22',
  redDeep: '#5A0F18',
  red: '#8E1B2A',
  redBright: '#C8354A',
  text: '#F2F2F3',
  textMuted: '#9A9AA4',
  comment: '#5E5E68'
};

// GitHub-style level ramp built from the brand reds.
const LEVELS = ['#141418', '#3F0D16', '#5A0F18', '#8E1B2A', '#C8354A'];

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const COLS = 53;
const X0 = 48;
const Y0 = 80;
const WIDTH = 860;
const HEIGHT = 228;

const utc = (iso) => new Date(`${iso}T00:00:00Z`);
const dayOfWeek = (d) => d.getUTCDay();
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

function stats(contributions) {
  let longest = 0;
  let run = 0;

  for (const day of contributions) {
    if (day.count > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  let current = 0;
  let i = contributions.length - 1;
  if (i >= 0 && contributions[i].count === 0) i -= 1;
  while (i >= 0 && contributions[i].count > 0) {
    current += 1;
    i -= 1;
  }

  return { longest, current };
}

function monthLabels(contributions, start) {
  const labels = [];
  let lastMonth = -1;
  let lastWeek = -99;

  contributions.forEach((day) => {
    const date = utc(day.date);
    const week = Math.floor((date - start) / (7 * 86400000));
    const month = date.getUTCMonth();

    if (month !== lastMonth && week - lastWeek >= 3) {
      labels.push({
        week,
        text: date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
      });
      lastMonth = month;
      lastWeek = week;
    }
  });

  return labels;
}

function build(contributions, total) {
  const first = utc(contributions[0].date);
  const start = addDays(first, -dayOfWeek(first));

  const cells = contributions.map((day) => {
    const date = utc(day.date);
    const week = Math.floor((date - start) / (7 * 86400000));
    return {
      x: X0 + week * STEP,
      y: Y0 + dayOfWeek(date) * STEP,
      level: Math.max(0, Math.min(4, day.level ?? 0)),
      count: day.count,
      date: day.date
    };
  });

  const months = monthLabels(contributions, start);
  const { current, longest } = stats(contributions);

  const monthText = months
    .map(
      (m) =>
        `<text x="${X0 + m.week * STEP}" y="${Y0 - 14}" fill="${BRAND.textMuted}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10">${m.text}</text>`
    )
    .join('');

  const weekdays = [
    { day: 1, label: 'Mon' },
    { day: 3, label: 'Wed' },
    { day: 5, label: 'Fri' }
  ]
    .map(
      (w) =>
        `<text x="${X0 - 8}" y="${Y0 + w.day * STEP + 9}" text-anchor="end" fill="${BRAND.comment}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10">${w.label}</text>`
    )
    .join('');

  const grid = cells
    .map(
      (c) =>
        `<rect x="${c.x}" y="${c.y}" width="${CELL}" height="${CELL}" rx="2" fill="${LEVELS[c.level]}"><title>${c.count} on ${c.date}</title></rect>`
    )
    .join('');

  const legendX = WIDTH - 48 - (5 * (CELL + 3) - 3) - 42;
  const legend = LEVELS.map(
    (color, i) =>
      `<rect x="${legendX + i * (CELL + 3)}" y="${HEIGHT - 30}" width="${CELL}" height="${CELL}" rx="2" fill="${color}"/>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${total} contributions in the last year">
  <rect width="${WIDTH}" height="${HEIGHT}" rx="10" fill="${BRAND.bg}" stroke="${BRAND.raised}"/>
  <rect x="1" y="1" width="${WIDTH - 2}" height="2" rx="1" fill="${BRAND.red}"/>

  <text x="${X0}" y="34" fill="${BRAND.redBright}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="4">CONTRIBUTIONS</text>
  <text x="${X0}" y="56" fill="${BRAND.text}" font-family="ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif" font-size="18" font-weight="600">${total} in the last year</text>

  <text x="${WIDTH - 48}" y="34" text-anchor="end" fill="${BRAND.textMuted}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" letter-spacing="2">CURRENT STREAK</text>
  <text x="${WIDTH - 48}" y="56" text-anchor="end" fill="${BRAND.text}" font-family="ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif" font-size="18" font-weight="600">${current} days <tspan fill="${BRAND.comment}" font-size="12">· best ${longest}</tspan></text>

  ${monthText}
  ${weekdays}
  ${grid}

  <text x="${legendX - 10}" y="${HEIGHT - 21}" text-anchor="end" fill="${BRAND.comment}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10">Less</text>
  ${legend}
  <text x="${legendX + 5 * (CELL + 3) + 2}" y="${HEIGHT - 21}" fill="${BRAND.comment}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10">More</text>
</svg>
`;
}

const response = await fetch(API);

if (!response.ok) {
  throw new Error(`Contribution API failed: ${response.status}`);
}

const data = await response.json();
const total = data.total?.lastYear ?? data.contributions.length;

if (!Array.isArray(data.contributions) || data.contributions.length < 7) {
  throw new Error('Contribution API returned an unexpected payload');
}

const svg = build(data.contributions, total);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, svg, 'utf8');

console.log(`Wrote ${OUT} (${total} contributions, ${COLS} weeks)`);
