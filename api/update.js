const { Redis } = require('@upstash/redis');
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });
  try {
    let body = '';
    for await (const chunk of req) body += chunk;
    const updates = JSON.parse(body);
    const raw = await redis.get(`invoice:${id}`);
    if (!raw) return res.status(404).json({ error: 'Invoice not found' });
    const inv = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const updated = { ...inv, extracted: { ...inv.extracted, ...updates }, updatedAt: new Date().toISOString() };
    await redis.set(`invoice:${id}`, JSON.stringify(updated), { ex: 31536000 });
    return res.status(200).json({ success: true, invoice: updated });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
