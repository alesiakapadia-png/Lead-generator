import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';

const KEYWORDS = [
  "High ticket sales training",
  "High ticket closer certification",
  "Women in sales coaching",
  "How to become a high ticket closer",
  "Sales confidence coaching for women",
  "High income remote careers",
  "High ticket sales frameworks",
  "Objection handling training",
  "Women empowerment sales program",
  "Best high ticket closing course",
  "High ticket coaching business model",
  "Remote sales jobs with training",
  "Sales authority frameworks",
  "Emotional ROI in sales",
  "Female high ticket closer success stories",
  "Sales funnel framework for closers",
  "AI-powered sales training",
  "Women’s generational wealth building",
  "Career change into high ticket sales",
  "High ticket sales academy"
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  trimValues: true
});

function googleNewsUrl(q) {
  const base = 'https://news.google.com/rss/search';
  const params = new URLSearchParams({ q, hl: 'en-US', gl: 'US', ceid: 'US:en' });
  return `${base}?${params.toString()}`;
}

function scoreItem(item, keywords) {
  const hay = (item.title + ' ' + (item.description || '')).toLowerCase();
  let hits = 0;
  for (const k of keywords) {
    const kk = k.toLowerCase();
    const c = hay.split(kk).length - 1;
    hits += c;
  }
  return hits;
}

function normalizeItem(x, keyword) {
  const title = x.title || '';
  const link = x.link || '';
  const pubDate = x.pubDate || x.published || x.updated || '';
  const source = (x.source && (x.source.text || x.source)) || 'Unknown';
  const description = x.description || '';
  return { title, link, pubDate, source, description, matchedKeyword: keyword };
}

async function fetchGoogleNewsForKeyword(keyword) {
  const url = googleNewsUrl(keyword);
  try {
    const res = await fetch(url, { timeout: 20000 });
    if (!res.ok) throw new Error('Bad status ' + res.status);
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const items = (((parsed || {}).rss || {}).channel || {}).item || [];
    return items.map(i => normalizeItem(i, keyword));
  } catch (err) {
    return [];
  }
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = (it.link || it.title).trim();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

export const config = { schedule: "@daily" };

export default async (req, context) => {
  try {
    const all = [];
    for (const k of KEYWORDS) {
      const items = await fetchGoogleNewsForKeyword(k);
      all.push(...items);
      await new Promise(r => setTimeout(r, 250));
    }
    const deduped = dedupe(all);
    for (const it of deduped) {
      it.score = scoreItem(it, KEYWORDS);
      it.isoDate = it.pubDate ? new Date(it.pubDate).toISOString() : null;
    }
    deduped.sort((a, b) => (b.score - a.score) || ((b.isoDate||'') < (a.isoDate||'') ? -1 : 1));
    const payload = {
      generatedAt: new Date().toISOString(),
      total: deduped.length,
      keywords: KEYWORDS,
      leads: deduped.slice(0, 200)
    };
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
