import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });
  try {
    const raw = await redis.get(`invoice:${id}`);
    if (!raw) return res.status(404).json({ error: 'Invoice not found' });
    const inv = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return res.status(200).json(inv); // Full record WITH images
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
