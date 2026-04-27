import { Redis } from '@upstash/redis';

export const config = { api: { bodyParser: false, sizeLimit: '20mb' } };

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function sha256(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2,'0'))
    .join('');
}

// ⚠️ IMPORTANT: req n'est plus un Node req classique
async function parseMultipart(req) {
  const formData = await req.formData();
  const file = formData.get('file');
  const originalName = formData.get('originalName');

  if (!file) return null;

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    name: file.name,
    originalName,
    type: file.type,
    buffer
  };
}

const SYSTEM_PROMPT = `...`;

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

    return await callGroq([{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${fileBuffer.toString('base64')}`
          }
        },
        { type: 'text', text: SYSTEM_PROMPT }
      ]
    }], true);
  }

  if (ext === 'xml') {
    return await callGroq([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Facture XML:\n${fileBuffer.toString('utf-8')}` }
    ]);
  }

  throw new Error('Format non supporté');
}

// ✅ NOUVELLE STRUCTURE
export async function POST(req) {
  try {
    const file = await parseMultipart(req);

    if (!file) {
      return Response.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    }

    const ext = file.name.split('.').pop().toLowerCase();

    if (!['jpg','jpeg','png','xml'].includes(ext)) {
      return Response.json({
        error: 'Format non supporté'
      }, { status: 400 });
    }

    const fingerprint = await sha256(file.buffer);

    const existing = await redis.get(`fingerprint:${fingerprint}`).catch(() => null);

    if (existing) {
      return Response.json({
        error: 'Doublon détecté',
        duplicate: true,
        existingId: existing
      }, { status: 409 });
    }

    const extracted = await analyzeInvoice(file.buffer, file.name);

    const timestamp = Date.now();
    const invoiceId = `INV-${timestamp}`;

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

    return Response.json({ success: true, invoice: record });

  } catch (err) {
    console.error('Erreur:', err);

    return Response.json({
      error: err.message
    }, { status: 500 });
  }
}
