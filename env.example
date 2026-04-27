import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID manquant' });
  try {
    const raw = await redis.get(`invoice:${id}`);
    if (!raw) return res.status(404).json({ error: 'Facture non trouvée' });
    return res.status(200).json(typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
