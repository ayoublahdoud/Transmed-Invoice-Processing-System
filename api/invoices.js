import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' });
  try {
    const ids = await redis.lrange('invoice:list', 0, 99).catch(() => []);
    if (!ids?.length) return res.status(200).json({ invoices: [], total: 0 });
    const records = await Promise.all(ids.map(id => redis.get(`invoice:${id}`).then(r => r ? (typeof r === 'string' ? JSON.parse(r) : r) : null)));
    return res.status(200).json({ invoices: records.filter(Boolean), total: records.filter(Boolean).length });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
