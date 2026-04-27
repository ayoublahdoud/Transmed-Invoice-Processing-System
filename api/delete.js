import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });
  try {
    const raw = await redis.get(`invoice:${id}`);
    if (!raw) return res.status(404).json({ error: 'Invoice not found' });
    const inv = typeof raw === 'string' ? JSON.parse(raw) : raw;
    await redis.del(`invoice:${id}`);
    if (inv.fingerprint) await redis.del(`fingerprint:${inv.fingerprint}`);
    await redis.lrem('invoice:list', 0, id);
    return res.status(200).json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
