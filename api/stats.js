import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
export default async function handler(req, res) {
  try {
    const ids = await redis.lrange('invoice:list', 0, 999).catch(() => []);
    const records = await Promise.all((ids||[]).map(id => redis.get(`invoice:${id}`).then(r => r ? (typeof r === 'string' ? JSON.parse(r) : r) : null)));
    const invoices = records.filter(Boolean);
    return res.status(200).json({ total: invoices.length, ocr_ia: invoices.filter(i=>i.route==='ocr_ia').length, digital_repo: invoices.filter(i=>i.route==='digital_repo').length, doublons: 0, montant_total: invoices.reduce((s,i)=>s+(i.extracted?.total_ttc||0),0), fournisseurs: [...new Set(invoices.map(i=>i.extracted?.fournisseur?.nom).filter(Boolean))].length });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
