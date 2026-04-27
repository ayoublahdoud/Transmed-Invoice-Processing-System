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

    const invoices = await Promise.all(
      ids.map(id => redis.get(`invoice:${id}`))
    );

    const parsed = invoices
      .filter(Boolean)
      .map(i => (typeof i === 'string' ? JSON.parse(i) : i));

    const totalInvoices = parsed.length;

    const totalValue = parsed.reduce(
      (sum, inv) => sum + (inv.extracted?.total_ttc || 0),
      0
    );

    const aiProcessed = parsed.filter(
      inv => inv.route === 'ocr_ia'
    ).length;

    const digitalRepo = parsed.filter(
      inv => inv.route === 'digital_repo'
    ).length;

    return res.status(200).json({
      totalInvoices,
      totalValue,
      aiProcessed,
      digitalRepo
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
