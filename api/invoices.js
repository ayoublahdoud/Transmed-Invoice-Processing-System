import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ids = await redis.lrange('invoice:list', 0, -1);

    if (!ids || ids.length === 0) {
      return res.status(200).json([]);
    }

    const invoices = await Promise.all(
      ids.map(id => redis.get(`invoice:${id}`))
    );

    const parsed = invoices
      .filter(Boolean)
      .map(i => (typeof i === 'string' ? JSON.parse(i) : i));

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
