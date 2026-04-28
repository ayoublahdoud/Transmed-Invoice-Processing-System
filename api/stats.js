import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ids = await redis.lrange('invoice:list', 0, 999).catch(() => []);
    const records = await Promise.all((ids||[]).map(async id => {
      const r = await redis.get(`invoice:${id}`);
      if (!r) return null;
      const inv = typeof r === 'string' ? JSON.parse(r) : r;
      const { images, ...rest } = inv;
      return rest;
    }));
    const invoices = records.filter(Boolean);
    const suppliers = [...new Set(invoices.map(i => i.extracted?.fournisseur?.nom || i.extracted?.client?.nom).filter(Boolean))];
    const total_ttc = invoices.reduce((s, i) => s + (i.extracted?.total_ttc || 0), 0);
    return res.status(200).json({
      total: invoices.length,
      ocr_ia: invoices.filter(i => i.route === 'ocr_ia').length,
      digital_repo: invoices.filter(i => i.route === 'digital_repo').length,
      doublons: 0,
      montant_total: total_ttc,
      fournisseurs: suppliers.length
    });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
