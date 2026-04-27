import { Redis } from '@upstash/redis';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = { api: { bodyParser: false } };

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
      if (!boundaryMatch) return resolve(null);
      const boundary = boundaryMatch[1];
      const parts = buffer.toString('binary').split(`--${boundary}`);
      let file = null;
      for (const part of parts) {
        if (part.includes('filename=')) {
          const nameMatch = part.match(/filename="(.+?)"/);
          const typeMatch = part.match(/Content-Type: (.+?)\r\n/);
          const dataStart = part.indexOf('\r\n\r\n') + 4;
          const dataEnd = part.lastIndexOf('\r\n');
          if (nameMatch && dataStart > 3) {
            file = {
              name: nameMatch[1],
              type: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
              buffer: Buffer.from(part.substring(dataStart, dataEnd), 'binary')
            };
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Tu es un expert en extraction de données de factures pour Transmed (pharmacie, Maroc).
Analyse cette facture et réponds UNIQUEMENT en JSON valide, sans texte avant ou après.
Format OBLIGATOIRE:
{
  "numero_facture": "string ou null",
  "date_facture": "YYYY-MM-DD ou null",
  "date_echeance": "YYYY-MM-DD ou null",
  "fournisseur": {
    "nom": "string",
    "adresse": "string ou null",
    "telephone": "string ou null",
    "ice": "string ou null"
  },
  "client": { "nom": "string ou null", "adresse": "string ou null" },
  "lignes": [{ "description": "string", "quantite": 1, "prix_unitaire": 0, "montant": 0 }],
  "sous_total": 0,
  "tva_taux": 20,
  "tva_montant": 0,
  "total_ttc": 0,
  "devise": "MAD",
  "mode_paiement": "string ou null",
  "notes": "string ou null",
  "confiance": 0.9
}`;

  let result;
  if (ext === 'xml') {
    result = await model.generateContent([prompt, `\n\nFacture XML:\n${fileBuffer.toString('utf-8')}`]);
  } else if (ext === 'pdf') {
    result = await model.generateContent([
      prompt,
      { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'application/pdf' } }
    ]);
  } else {
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    result = await model.generateContent([
      prompt,
      { inlineData: { data: fileBuffer.toString('base64'), mimeType } }
    ]);
  }

  const text = result.response.text().trim();
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
    if (!['pdf', 'jpg', 'jpeg', 'png', 'xml'].includes(ext)) {
      return res.status(400).json({ error: `Format non supporté: ${file.name}` });
    }

    // SHA-256 fingerprint pour déduplication
    const fingerprint = await sha256(file.buffer);
    const existing = await redis.get(`fingerprint:${fingerprint}`).catch(() => null);
    if (existing) {
      return res.status(409).json({ error: 'Doublon détecté', duplicate: true, existingId: existing });
    }

    // Analyse IA Gemini (traitement en mémoire — pas de stockage fichier)
    const extracted = await analyzeInvoice(file.buffer, file.name);

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

    // Sauvegarde métadonnées dans Redis
    await redis.set(`invoice:${invoiceId}`, JSON.stringify(invoiceRecord), { ex: 31536000 });
    await redis.set(`fingerprint:${fingerprint}`, invoiceId, { ex: 31536000 });
    await redis.lpush('invoice:list', invoiceId);

    return res.status(200).json({ success: true, invoice: invoiceRecord });
  } catch (err) {
    console.error('Erreur:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne' });
  }
}
