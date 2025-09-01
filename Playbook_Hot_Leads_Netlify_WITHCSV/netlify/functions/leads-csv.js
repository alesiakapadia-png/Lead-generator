import leads from './leads.js';

export default async (req, ctx) => {
  const jsonRes = await leads(req, ctx);
  const data = await jsonRes.json();

  const headers = ['title','link','source','pubDate','matchedKeyword','score'];
  const rows = (data.leads || []).map(i =>
    [i.title, i.link, i.source || '', i.pubDate || '', i.matchedKeyword || '', i.score || 0]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="hot-leads.csv"',
      'access-control-allow-origin': '*'
    }
  });
};
