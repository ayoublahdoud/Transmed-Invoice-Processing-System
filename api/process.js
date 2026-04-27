const { Redis } = require('@upstash/redis');
export const config = { api: { bodyParser: false, sizeLimit: '20mb' } };

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

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
      let file = null, originalName = null;
      for (const part of parts) {
        if (!part.includes('filename=')) continue;
        const nm = part.match(/filename="(.+?)"/);
        const tm = part.match(/Content-Type: (.+?)\r\n/);
        const ds = part.indexOf('\r\n\r\n') + 4;
        const de = part.lastIndexOf('\r\n');
        if (nm && ds > 3) {
          file = { name: nm[1], type: tm?.[1]?.trim() || 'application/octet-stream', buffer: Buffer.from(part.substring(ds, de), 'binary') };
        }
      }
      // Check for originalName field
      for (const part of parts) {
        if (part.includes('name="originalName"')) {
          const ds = part.indexOf('\r\n\r\n') + 4;
          const de = part.lastIndexOf('\r\n');
          if (ds > 3) originalName = part.substring(ds, de).trim();
        }
      }
      if (file && originalName) file.originalName = originalName;
      resolve(file);
    });
    req.on('error', reject);
  });
}

const SYSTEM_PROMPT = `Tu es un expert comptable Transmed Maroc. Analyse cette facture et réponds UNIQUEMENT en JSON valide sans texte avant ou après:
{"numero_facture":null,"date_facture":null,"date_echeance":null,"fournisseur":{"nom":"","adresse":null,"telephone":null,"ice":null},"client":{"nom":null,"adresse":null},"lignes":[{"description":"","quantite":1,"prix_unitaire":0,"montant":0}],"sous_total":0,"tva_taux":20,"tva_montant":0,"total_ttc":0,"devise":"MAD","mode_paiement":null,"notes":null,"confiance":0.9}`;

async function callGroq(messages, vision = false) {
  const model = vision ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: 2000, temperature: 0.1 })
  });
  if (!r.ok) throw new Error(`Groq: ${await r.text()}`);
  const d = await r.json();
  const text = d.choices?.[0]?.message?.content?.trim() || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Réponse IA invalide');
  return JSON.parse(m[0]);
}

async function analyzeInvoice(fileBuffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();

  if (['jpg','jpeg','png'].includes(ext)) {
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    return await callGroq([{ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBuffer.toString('base64')}` } },
      { type: 'text', text: SYSTEM_PROMPT }
    ]}], true);
  }

  if (ext === 'xml') {
    return await callGroq([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Facture XML:\n${fileBuffer.toString('utf-8')}` }
    ], false);
  }

  throw new Error('Format non supporté');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  try {
    const file = await parseMultipart(req);
    if (!file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg','jpeg','png','xml'].includes(ext)) {
      return res.status(400).json({ error: 'Format non supporté. Le PDF est converti automatiquement côté client.' });
    }

    const fingerprint = await sha256(file.buffer);
    const existing = await redis.get(`fingerprint:${fingerprint}`).catch(() => null);
    if (existing) return res.status(409).json({ error: 'Doublon détecté', duplicate: true, existingId: existing });

    const extracted = await analyzeInvoice(file.buffer, file.name);
    const timestamp = Date.now();
    const invoiceId = `INV-${timestamp}`;
    const displayName = file.originalName || file.name;
    const record = {
      id: invoiceId, filename: displayName, size: file.buffer.length,
      fingerprint, route: ext === 'xml' ? 'digital_repo' : 'ocr_ia',
      status: 'traite', processedAt: new Date().toISOString(), extracted
    };

    await redis.set(`invoice:${invoiceId}`, JSON.stringify(record), { ex: 31536000 });
    await redis.set(`fingerprint:${fingerprint}`, invoiceId, { ex: 31536000 });
    await redis.lpush('invoice:list', invoiceId);

    return res.status(200).json({ success: true, invoice: record });
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: err.message });
  }
}
