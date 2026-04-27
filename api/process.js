import { put } from '@vercel/blob';
import Anthropic from '@anthropic-ai/sdk';

export const config = { api: { bodyParser: false } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// SHA-256 fingerprint via Web Crypto
async function sha256(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Parse multipart form data manually
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
            const rawData = part.substring(dataStart, dataEnd);
            file = {
              name: nameMatch[1],
              type: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
              buffer: Buffer.from(rawData, 'binary')
            };
          }
        }
      }
      resolve(file);
    });
    req.on('error', reject);
  });
}

// Validate MIME type
function validateMime(filename, mimetype) {
  const ext = filename.split('.').pop().toLowerCase();
  const allowed = {
    pdf: ['application/pdf'],
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    png: ['image/png'],
    xml: ['text/xml', 'application/xml']
  };
  return allowed[ext] !== undefined;
}

// Call Claude API for real invoice extraction
async function analyzeInvoice(fileBuffer, filename, mimetype) {
  const ext = filename.split('.').pop().toLowerCase();
  
  let content = [];
  
  if (ext === 'xml') {
    // Parse XML as text
    const xmlText = fileBuffer.toString('utf-8');
    content = [
      {
        type: 'text',
        text: `Voici une facture au format XML. Extrais toutes les informations importantes:\n\n${xmlText}`
      }
    ];
  } else {
    // PDF or image — send as base64
    const base64 = fileBuffer.toString('base64');
    const mediaType = ext === 'pdf' ? 'application/pdf' : 
                      ext === 'png' ? 'image/png' : 'image/jpeg';
    
    if (ext === 'pdf') {
      content = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64
          }
        },
        {
          type: 'text',
          text: 'Analyse cette facture et extrais toutes les informations.'
        }
      ];
    } else {
      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64
          }
        },
        {
          type: 'text',
          text: 'Analyse cette facture et extrais toutes les informations.'
        }
      ];
    }
  }

  const systemPrompt = `Tu es un expert en extraction de données de factures pour une entreprise pharmaceutique marocaine (Transmed). 
Tu dois extraire les informations structurées de chaque facture et répondre UNIQUEMENT en JSON valide, sans aucun texte avant ou après.

Format de réponse OBLIGATOIRE (JSON pur):
{
  "numero_facture": "string ou null",
  "date_facture": "YYYY-MM-DD ou null",
  "date_echeance": "YYYY-MM-DD ou null",
  "fournisseur": {
    "nom": "string",
    "adresse": "string ou null",
    "telephone": "string ou null",
    "email": "string ou null",
    "ice": "string ou null"
  },
  "client": {
    "nom": "string ou null",
    "adresse": "string ou null"
  },
  "lignes": [
    {
      "description": "string",
      "quantite": number,
      "prix_unitaire": number,
      "montant": number
    }
  ],
  "sous_total": number ou null,
  "tva_taux": number ou null,
  "tva_montant": number ou null,
  "total_ttc": number ou null,
  "devise": "MAD",
  "mode_paiement": "string ou null",
  "notes": "string ou null",
  "confiance": number entre 0 et 1
}

Si une information n'est pas trouvée, mets null. Les montants doivent être des nombres (pas des strings).`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content }]
  });

  const text = response.content[0].text.trim();
  
  // Clean JSON if needed
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse IA invalide');
  
  return JSON.parse(jsonMatch[0]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // 1. Parse uploaded file
    const file = await parseMultipart(req);
    if (!file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    // 2. Validate MIME type
    if (!validateMime(file.name, file.type)) {
      return res.status(400).json({ 
        error: `Format non supporté: ${file.name}. Formats acceptés: PDF, JPEG, PNG, XML` 
      });
    }

    // 3. SHA-256 fingerprint
    const fingerprint = await sha256(file.buffer);

    // 4. Check for duplicates via KV store
    const { kv } = await import('@vercel/kv');
    const existing = await kv.get(`fingerprint:${fingerprint}`).catch(() => null);
    if (existing) {
      return res.status(409).json({ 
        error: 'Doublon détecté',
        duplicate: true,
        existingId: existing,
        fingerprint
      });
    }

    // 5. Upload to Vercel Blob
    const timestamp = Date.now();
    const blobName = `invoices/${timestamp}-${file.name}`;
    const blob = await put(blobName, file.buffer, {
      access: 'private',
      contentType: file.type
    });

    // 6. Claude AI analysis (real OCR + extraction)
    const extracted = await analyzeInvoice(file.buffer, file.name, file.type);

    // 7. Determine route
    const ext = file.name.split('.').pop().toLowerCase();
    const route = ext === 'xml' ? 'digital_repo' : 'ocr_ia';

    // 8. Build invoice record
    const invoiceId = `INV-${timestamp}`;
    const invoiceRecord = {
      id: invoiceId,
      filename: file.name,
      size: file.buffer.length,
      mimetype: file.type,
      fingerprint,
      blobUrl: blob.url,
      route,
      status: 'traite',
      processedAt: new Date().toISOString(),
      extracted
    };

    // 9. Store in KV
    await kv.set(`invoice:${invoiceId}`, JSON.stringify(invoiceRecord), { ex: 60 * 60 * 24 * 365 });
    await kv.set(`fingerprint:${fingerprint}`, invoiceId, { ex: 60 * 60 * 24 * 365 });
    await kv.lpush('invoice:list', invoiceId);

    return res.status(200).json({
      success: true,
      invoice: invoiceRecord
    });

  } catch (err) {
    console.error('Erreur traitement facture:', err);
    return res.status(500).json({ 
      error: err.message || 'Erreur interne du serveur' 
    });
  }
}
