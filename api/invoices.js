import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ids = await redis.lrange('invoice:list', 0, 99).catch(() => []);
    if (!ids?.length) return res.status(200).json({ invoices: [], total: 0 });
    const records = await Promise.all(ids.map(async id => {
      const r = await redis.get(`invoice:${id}`);
      if (!r) return null;
      const inv = typeof r === 'string' ? JSON.parse(r) : r;
      // Don't send images in list (too heavy) - only metadata
      const { images, ...rest } = inv;
      return { ...rest, hasImages: images && images.length > 0, pageCount: images?.length || 0 };
    }));
    const invoices = records.filter(Boolean);
    return res.status(200).json({ invoices, total: invoices.length });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
