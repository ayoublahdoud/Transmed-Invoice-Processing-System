import { Redis } from '@upstash/redis';

export const config = { api: { bodyParser: false } };

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN  = process.env.CF_API_TOKEN;

async function sha256(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const ct = req.headers['content-type'] || '';
      const bm = ct.match(/boundary=([^\s;]+)/);
      if (!bm) return resolve(null);
      const parts = buffer.toString('binary').split(`--${bm[1]}`);
      let file = null;
      for (const part of parts) {
        if (!part.includes('filename=')) continue;
        const nm = part.match(/filename="(.+?)"/);
        const tm = part.match(/Content-Type: (.+?)\r\n/);
        const ds = part.indexOf('\r\n\r\n') + 4;
        const de = part.lastIndexOf('\r\n');
        if (nm && ds > 3) {
          file = {
            name: nm[1],
            type: tm ? tm[1].trim() : 'application/octet-stream',
            buffer: Buffer.from(part.substring(ds, de), 'binary')
          };
        }
      }
      resolve(file);
    });
    req.on('error', reject);
  });
}

async function analyzeWithCloudflareAI(fileBuffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const base64 = fileBuffer.toString('base64');

  const prompt = `Tu es un expert comptable spécialisé en factures pharmaceutiques au Maroc pour la société Transmed.
Analyse cette facture et réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans markdown.
Format exact:
{
  "numero_facture": null,
  "date_facture": null,
  "date_echeance": null,
  "fournisseur": { "nom": "", "adresse": null, "telephone": null, "ice": null },
  "client": { "nom": null, "adresse": null },
  "lignes": [{ "description": "", "quantite": 1, "prix_unitaire": 0, "montant": 0 }],
  "sous_total": 0,
  "tva_taux": 20,
  "tva_montant": 0,
  "total_ttc": 0,
  "devise": "MAD",
  "mode_paiement": null,
  "notes": null,
  "confiance": 0.9
}`;

  let body;

  if (ext === 'xml') {
    // Text-only for XML
    body = {
      messages: [
        { role: 'system', content: 'Tu es un expert en extraction de données de factures pharmaceutiques Maroc. Réponds uniquement en JSON.' },
        { role: 'user', content: `${prompt}\n\nFacture XML:\n${fileBuffer.toString('utf-8')}` }
      ],
      max_tokens: 2000
    };
  } else {
    // Vision model for PDF/images
    const mimeType = ext === 'png' ? 'image/png' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
    body = {
      messages: [
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: prompt }
        ]}
      ],
      max_tokens: 2000
    };
  }

  const model = ext === 'xml'
    ? '@cf/meta/llama-3.1-8b-instruct'
    : '@cf/meta/llama-3.2-11b-vision-instruct';

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cloudflare AI error: ${err}`);
  }

  const data = await response.json();
  const text = (data.result?.response || '').trim();
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
    if (!['pdf','jpg','jpeg','png','xml'].includes(ext)) {
      return res.status(400).json({ error: `Format non supporté: ${file.name}` });
    }

    const fingerprint = await sha256(file.buffer);
    const existing = await redis.get(`fingerprint:${fingerprint}`).catch(() => null);
    if (existing) {
      return res.status(409).json({ error: 'Doublon détecté', duplicate: true, existingId: existing });
    }

    const extracted = await analyzeWithCloudflareAI(file.buffer, file.name);

    const timestamp = Date.now();
    const invoiceId = `INV-${timestamp}`;
    const invoiceRecord = {
      id: invoiceId,
      filename: file.name,
      size: file.buffer.length,
      mimetype: file.type,
      fingerprint,
      route: ext === 'xml' ? 'digital_repo' : 'ocr_ia',
      status: 'traite',
      processedAt: new Date().toISOString(),
      extracted
    };

    await redis.set(`invoice:${invoiceId}`, JSON.stringify(invoiceRecord), { ex: 31536000 });
    await redis.set(`fingerprint:${fingerprint}`, invoiceId, { ex: 31536000 });
    await redis.lpush('invoice:list', invoiceId);

    return res.status(200).json({ success: true, invoice: invoiceRecord });
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne' });
  }
}
