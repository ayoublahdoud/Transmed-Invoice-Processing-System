import { Redis } from '@upstash/redis';
import crypto from 'crypto';

export const config = {
  api: { bodyParser: false, sizeLimit: '20mb' }
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ✅ SHA256
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ✅ Multipart parser (Node.js compatible Vercel)
async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));

    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      const match = contentType.match(/boundary=(.+)$/);

      if (!match) return resolve(null);

      const boundary = match[1];
      const parts = buffer.toString('binary').split(`--${boundary}`);

      let file = null;
      let originalName = null;

      for (const part of parts) {
        if (!part.includes('filename=')) continue;

        const nameMatch = part.match(/filename="(.+?)"/);
        const typeMatch = part.match(/Content-Type: (.+?)\r\n/);
        const start = part.indexOf('\r\n\r\n') + 4;
        const end = part.lastIndexOf('\r\n');

        if (nameMatch) {
          file = {
            name: nameMatch[1],
            type: typeMatch?.[1]?.trim() || 'application/octet-stream',
            buffer: Buffer.from(part.substring(start, end), 'binary')
          };
        }
      }

      for (const part of parts) {
        if (part.includes('name="originalName"')) {
          const start = part.indexOf('\r\n\r\n') + 4;
          const end = part.lastIndexOf('\r\n');
          originalName = part.substring(start, end).trim();
        }
      }

      if (file && originalName) file.originalName = originalName;

      resolve(file);
    });

    req.on('error', reject);
  });
}

// ✅ IA (Groq)
const SYSTEM_PROMPT = `Tu es un expert comptable Transmed Maroc. Analyse cette facture et réponds UNIQUEMENT en JSON valide.`;

async function callGroq(messages, vision = false) {
  const model = vision
    ? 'meta-llama/llama-4-scout-17b-16e-instruct'
    : 'llama-3.3-70b-versatile';

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2000,
      temperature: 0.1
    })
  });

  if (!r.ok) throw new Error(await r.text());

  const d = await r.json();
  const text = d.choices?.[0]?.message?.content?.trim() || '';
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) throw new Error('Réponse IA invalide');

  return JSON.parse(match[0]);
}

// ✅ Analyse facture
async function analyzeInvoice(buffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();

  if (['jpg','jpeg','png'].includes(ext)) {
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

    return callGroq([{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:${mime};base64,${buffer.toString('base64')}`
          }
        },
        { type: 'text', text: SYSTEM_PROMPT }
      ]
    }], true);
  }

  if (ext === 'xml') {
    return callGroq([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buffer.toString('utf-8') }
    ]);
  }

  throw new Error('Format non supporté');
}

// ✅ HANDLER PRINCIPAL
export default async function handler(req, res) {

  // 🔒 Autoriser uniquement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const file = await parseMultipart(req);

    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    const ext = file.name.split('.').pop().toLowerCase();

    if (!['jpg','jpeg','png','xml'].includes(ext)) {
      return res.status(400).json({ error: 'Format non supporté' });
    }

    const fingerprint = sha256(file.buffer);

    const existing = await redis.get(`fingerprint:${fingerprint}`).catch(() => null);

    if (existing) {
      return res.status(409).json({
        error: 'Doublon détecté',
        duplicate: true,
        existingId: existing
      });
    }

    const extracted = await analyzeInvoice(file.buffer, file.name);

    const invoiceId = `INV-${Date.now()}`;

    const record = {
      id: invoiceId,
      filename: file.originalName || file.name,
      size: file.buffer.length,
      fingerprint,
      route: ext === 'xml' ? 'digital_repo' : 'ocr_ia',
      status: 'traite',
      processedAt: new Date().toISOString(),
      extracted
    };

    await redis.set(`invoice:${invoiceId}`, JSON.stringify(record), { ex: 31536000 });
    await redis.set(`fingerprint:${fingerprint}`, invoiceId, { ex: 31536000 });
    await redis.lpush('invoice:list', invoiceId);

    return res.status(200).json({
      success: true,
      invoice: record
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
}
