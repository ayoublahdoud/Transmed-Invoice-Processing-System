import { Redis } from '@upstash/redis';

export const config = { api: { bodyParser: false, sizeLimit: '25mb' } };

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
      const boundary = bm[1];
      const parts = buffer.toString('binary').split(`--${boundary}`);

      let file = null;
      let originalName = null;
      let pagesData = null; // JSON array of base64 strings for all pages

      for (const part of parts) {
        if (part.includes('filename=')) {
          const nm = part.match(/filename="(.+?)"/);
          const tm = part.match(/Content-Type: (.+?)\r\n/);
          const ds = part.indexOf('\r\n\r\n') + 4;
          const de = part.lastIndexOf('\r\n');
          if (nm && ds > 3) {
            file = {
              name: nm[1],
              type: tm?.[1]?.trim() || 'application/octet-stream',
              buffer: Buffer.from(part.substring(ds, de), 'binary')
            };
          }
        } else if (part.includes('name="originalName"')) {
          const ds = part.indexOf('\r\n\r\n') + 4;
          const de = part.lastIndexOf('\r\n');
          if (ds > 3) originalName = part.substring(ds, de).trim();
        } else if (part.includes('name="pagesData"')) {
          const ds = part.indexOf('\r\n\r\n') + 4;
          const de = part.lastIndexOf('\r\n');
          if (ds > 3) {
            try { pagesData = JSON.parse(part.substring(ds, de).trim()); } catch(e) {}
          }
        }
      }
      if (file && originalName) file.originalName = originalName;
      if (file) file.pagesData = pagesData;
      resolve(file);
    });
    req.on('error', reject);
  });
}

// Prompt adapté au format exact des factures JESSY DIFFUSION / TRANSMED
const SYSTEM_PROMPT = `Tu es un expert comptable spécialisé dans les factures de JESSY DIFFUSION "A TRANSMED COMPANY" au Maroc.

Ces factures ont le format suivant:
- Entête: Facture N°, DATE, Référence Client, Notre Référence (SO...), BON DE LIVRAISON (BL...)
- Commercial: nom et téléphone
- Client: code client, nom, adresse, ICE N°
- Fournisseur: JESSY DIFFUSION, adresse Casablanca, ICE, Autorisation ONSSA
- Tableau lignes: N°, REF, CODE BARRE, DÉSIGNATION, QTY, U.M., PRIX UNITAIRE, REMISE (%), TOTAL HT, TVA (%)
- Totaux: TOTAL brut, REMISE totale, HT NET, TVA montant, TOTAL T.T.C.
- Pied: montant en lettres, règlement (Pas de crédit / chèque / espèces)

Réponds UNIQUEMENT en JSON valide sans texte avant ou après:
{
  "numero_facture": "string ou null",
  "date_facture": "YYYY-MM-DD ou null",
  "reference_client": "string ou null",
  "notre_reference": "string SO... ou null",
  "bon_livraison": "string BL... ou null",
  "commercial": "nom / telephone ou null",
  "client": {
    "code": "string ou null",
    "nom": "string ou null",
    "adresse": "string ou null",
    "ice": "string ou null",
    "telephone": "string ou null"
  },
  "fournisseur": {
    "nom": "JESSY DIFFUSION",
    "adresse": "string ou null",
    "telephone": "string ou null",
    "ice": "string ou null",
    "onssa": "string ou null"
  },
  "lignes": [
    {
      "n": 1,
      "ref": "string ou null",
      "code_barre": "string ou null",
      "description": "string",
      "quantite": 1,
      "unite": "EA ou null",
      "prix_unitaire": 0,
      "remise_pct": 0,
      "total_ht": 0,
      "tva_pct": 20
    }
  ],
  "sous_total_brut": 0,
  "remise_totale": 0,
  "ht_net": 0,
  "tva_taux": 20,
  "tva_montant": 0,
  "total_ttc": 0,
  "devise": "MAD",
  "mode_paiement": "string ou null",
  "montant_lettres": "string ou null",
  "notes": "string ou null",
  "confiance": 0.9
}`;

async function callGroqVision(base64Images, mimeType, groqKey) {
  // Build content with all page images
  const imageContent = base64Images.map(b64 => ({
    type: 'image_url',
    image_url: { url: `data:${mimeType};base64,${b64}` }
  }));

  const messages = [{
    role: 'user',
    content: [
      ...imageContent,
      { type: 'text', text: SYSTEM_PROMPT }
    ]
  }];

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages,
      max_tokens: 3000,
      temperature: 0.1
    })
  });

  if (!r.ok) throw new Error(`Groq error: ${await r.text()}`);
  const d = await r.json();
  const text = d.choices?.[0]?.message?.content?.trim() || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Réponse IA invalide');
  return JSON.parse(m[0]);
}

async function callGroqText(xmlContent, groqKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Facture XML:\n${xmlContent}` }
      ],
      max_tokens: 3000,
      temperature: 0.1
    })
  });
  if (!r.ok) throw new Error(`Groq error: ${await r.text()}`);
  const d = await r.json();
  const text = d.choices?.[0]?.message?.content?.trim() || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Réponse IA invalide');
  return JSON.parse(m[0]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const file = await parseMultipart(req);
    if (!file) return res.status(400).json({ error: 'No file received' });

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg','jpeg','png','xml'].includes(ext)) {
      return res.status(400).json({ error: 'Unsupported format. PDF is converted client-side.' });
    }

    // SHA-256 deduplication
    const fingerprint = await sha256(file.buffer);
    const existing = await redis.get(`fingerprint:${fingerprint}`).catch(() => null);
    if (existing) return res.status(409).json({ error: 'Duplicate detected', duplicate: true, existingId: existing });

    let extracted;
    let storedImages = []; // base64 images for viewing

    if (ext === 'xml') {
      extracted = await callGroqText(file.buffer.toString('utf-8'), process.env.GROQ_API_KEY);
    } else {
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      // Use pagesData if provided (all PDF pages), otherwise just the single image
      const allPages = file.pagesData && file.pagesData.length > 0
        ? file.pagesData
        : [file.buffer.toString('base64')];

      storedImages = allPages; // store all pages for viewing
      
      // Send up to 3 pages to AI (Groq vision limit)
      const pagesToAnalyze = allPages.slice(0, 3);
      extracted = await callGroqVision(pagesToAnalyze, mimeType, process.env.GROQ_API_KEY);
    }

    const timestamp = Date.now();
    const invoiceId = `INV-${timestamp}`;
    const displayName = file.originalName || file.name;
    const ext2 = displayName.split('.').pop().toLowerCase();

    const record = {
      id: invoiceId,
      filename: displayName,
      size: file.buffer.length,
      fingerprint,
      route: ext2 === 'xml' ? 'digital_repo' : 'ocr_ia',
      status: 'traite',
      processedAt: new Date().toISOString(),
      extracted,
      // Store images for document viewer
      images: storedImages,
      imageMimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
      pageCount: storedImages.length
    };

    await redis.set(`invoice:${invoiceId}`, JSON.stringify(record), { ex: 31536000 });
    await redis.set(`fingerprint:${fingerprint}`, invoiceId, { ex: 31536000 });
    await redis.lpush('invoice:list', invoiceId);

    // Return record without images for the list response (too large)
    const responseRecord = { ...record };
    delete responseRecord.images;

    return res.status(200).json({ success: true, invoice: responseRecord });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
