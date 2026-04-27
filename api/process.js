const { Redis } = require('@upstash/redis');
const crypto = require('crypto');

module.exports.config = {
  api: {
    bodyParser: false,
    sizeLimit: '20mb'
  }
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
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
          file = {
            name: nm[1],
            type: tm?.[1]?.trim() || 'application/octet-stream',
            buffer: Buffer.from(part.substring(ds, de), 'binary')
          };
        }
      }

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
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
      return res.status(409).json({ error: 'Doublon détecté' });
    }

    // 🔥 TEMPORAIRE (pour tester que ton API marche)
    const extracted = {
      fournisseur: { nom: "TEST" },
      total_ttc: 100
    };

    const invoiceId = `INV-${Date.now()}`;

    const record = {
      id: invoiceId,
      filename: file.originalName || file.name,
      fingerprint,
      route: ext === 'xml' ? 'digital_repo' : 'ocr_ia',
      extracted
    };

    await redis.set(`invoice:${invoiceId}`, JSON.stringify(record));
    await redis.lpush('invoice:list', invoiceId);

    return res.status(200).json({ success: true, invoice: record });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
