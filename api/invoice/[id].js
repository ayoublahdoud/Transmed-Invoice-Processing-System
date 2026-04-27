import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

// ⚡ SHA256
import crypto from 'crypto';
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ⚡ multipart parser
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
        const ds = part.indexOf('\r\n\r\n') + 4;
        const de = part.lastIndexOf('\r\n');

        if (nm && ds > 3) {
          file = {
            name: nm[1],
            buffer: Buffer.from(part.substring(ds, de), 'binary')
          };
        }
      }

      resolve(file);
    });

    req.on('error', reject);
  });
}

// ⚡ IA mock (garde ton vrai callGroq ici)
async function analyzeInvoice(buffer, filename) {
  return {
    numero_facture: "TEST-123",
    total_ttc: 100
  };
}

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    // =========================
    // 🔥 POST → /process
    // =========================
    if (id === 'process' && req.method === 'POST') {

      const file = await parseMultipart(req);

      if (!file) {
        return res.status(400).json({ error: 'Aucun fichier' });
      }

      const fingerprint = sha256(file.buffer);

      const existing = await redis.get(`fingerprint:${fingerprint}`);
      if (existing) {
        return res.status(409).json({
          error: 'Doublon',
          existingId: existing
        });
      }

      const extracted = await analyzeInvoice(file.buffer, file.name);

      const invoiceId = `INV-${Date.now()}`;

      const record = {
        id: invoiceId,
        filename: file.name,
        fingerprint,
        extracted,
        createdAt: new Date().toISOString()
      };

      await redis.set(`invoice:${invoiceId}`, JSON.stringify(record));
      await redis.set(`fingerprint:${fingerprint}`, invoiceId);

      return res.status(200).json({
        success: true,
        invoice: record
      });
    }

    // =========================
    // 📥 GET → /:id
    // =========================
    if (req.method === 'GET') {
      if (!id) {
        return res.status(400).json({ error: 'ID manquant' });
      }

      const raw = await redis.get(`invoice:${id}`);

      if (!raw) {
        return res.status(404).json({ error: 'Facture non trouvée' });
      }

      return res.status(200).json(
        typeof raw === 'string' ? JSON.parse(raw) : raw
      );
    }

    // =========================
    // ❌ autres méthodes
    // =========================
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
