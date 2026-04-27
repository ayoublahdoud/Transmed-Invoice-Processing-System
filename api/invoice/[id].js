import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID manquant' });

  try {
    const raw = await kv.get(`invoice:${id}`);
    if (!raw) return res.status(404).json({ error: 'Facture non trouvée' });
    return res.status(200).json(JSON.parse(raw));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
