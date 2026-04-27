import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const ids = await kv.lrange('invoice:list', 0, 99);
    if (!ids || ids.length === 0) return res.status(200).json({ invoices: [], total: 0 });

    const records = await Promise.all(
      ids.map(id => kv.get(`invoice:${id}`).then(r => r ? JSON.parse(r) : null))
    );

    const invoices = records.filter(Boolean);
    return res.status(200).json({ invoices, total: invoices.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
