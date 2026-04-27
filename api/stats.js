import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const ids = await kv.lrange('invoice:list', 0, 999).catch(() => []);
    const records = await Promise.all(
      (ids || []).map(id => kv.get(`invoice:${id}`).then(r => r ? JSON.parse(r) : null))
    );
    const invoices = records.filter(Boolean);

    const stats = {
      total: invoices.length,
      ocr_ia: invoices.filter(i => i.route === 'ocr_ia').length,
      digital_repo: invoices.filter(i => i.route === 'digital_repo').length,
      doublons: invoices.filter(i => i.status === 'doublon').length,
      montant_total: invoices.reduce((sum, i) => sum + (i.extracted?.total_ttc || 0), 0),
      fournisseurs: [...new Set(invoices.map(i => i.extracted?.fournisseur?.nom).filter(Boolean))].length
    };

    return res.status(200).json(stats);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
