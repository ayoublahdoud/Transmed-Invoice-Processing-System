import { put } from '@vercel/blob';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';

export const config = { api: { bodyParser: false } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function sha256(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const boundary = req.headers['content-type'].split('boundary=')[1];
      const parts = buffer.toString('binary').split(`--${boundary}`);
      let file = null;
      for (const part of parts) {
        if (part.includes('filename=')) {
          const nameMatch = part.match(/filename="(.+?)"/);
          const typeMatch = part.match(/Content-Type: (.+?)\r\n/);
          const dataStart = part.indexOf('\r\n\r\n') + 4;
          const dataEnd = part.lastIndexOf('\r\n');
          if (nameMatch && dataStart > 3) {
            file = { name: nameMatch[1], type: typeMatch ? typeMatch[1].trim() : 'application/octet-stream', buffer: Buffer.from(part.substring(dataStart, dataEnd), 'binary') };
          }
        }
      }
      resolve(file);
    });
    req.on('error', reject);
  });
}

async function analyzeInvoice(fileBuffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  let content = [];
  if (ext === 'xml') {
    content = [{ type: 'text', text: `Analyse cette facture XML:\n\n${fileBuffer.toString('utf-8')}` }];
  } else if (ext === 'pdf') {
    content = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBuffer.toString('base64') } }, { type: 'text', text: 'Analyse cette facture.' }];
  } else {
    content = [{ type: 'image', source: { type: 'base64', media_type: ext === 'png' ? 'image/png' : 'image/jpeg', data: fileBuffer.toString('base64') } }, { type: 'text', text: 'Analyse cette facture.' }];
  }
  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101', max_tokens: 2000,
    system: `Expert extraction factures Transmed Maroc. Réponds UNIQUEMENT en JSON:
{"numero_facture":null,"date_facture":null,"date_echeance":null,"fournisseur":{"nom":"","adresse":null,"telephone":null,"ice":null},"client":{"nom":null,"adresse":null},"lignes":[{"description":"","quantite":0,"prix_unitaire":0,"montant":0}],"sous_total":null,"tva_taux":null,"tva_montant":null,"total_ttc":null,"devise":"MAD","mode_paiement":null,"notes":null,"confiance":0.9}`,
    messages: [{ role: 'user', content }]
  });
  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse IA invalide');
  return JSON.parse(jsonMatch[0]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  try {
    const file = await parseMultipart(req);
    if (!file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','jpg','jpeg','png','xml'].includes(ext)) return res.status(400).json({ error: `Format non supporté: ${file.name}` });
    const fingerprint = await sha256(file.buffer);
    const existing = await redis.get(`fingerprint:${fingerprint}`).catch(() => null);
    if (existing) return res.status(409).json({ error: 'Doublon détecté', duplicate: true, existingId: existing });
    const timestamp = Date.now();
    const blob = await put(`invoices/${timestamp}-${file.name}`, file.buffer, { access: 'public', contentType: file.type });
    const extracted = await analyzeInvoice(file.buffer, file.name);
    const invoiceId = `INV-${timestamp}`;
    const invoiceRecord = { id: invoiceId, filename: file.name, size: file.buffer.length, mimetype: file.type, fingerprint, blobUrl: blob.url, route: ext === 'xml' ? 'digital_repo' : 'ocr_ia', status: 'traite', processedAt: new Date().toISOString(), extracted };
    await redis.set(`invoice:${invoiceId}`, JSON.stringify(invoiceRecord), { ex: 31536000 });
    await redis.set(`fingerprint:${fingerprint}`, invoiceId, { ex: 31536000 });
    await redis.lpush('invoice:list', invoiceId);
    return res.status(200).json({ success: true, invoice: invoiceRecord });
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne' });
  }
}
