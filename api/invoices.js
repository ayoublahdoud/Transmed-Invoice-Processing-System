const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const ids = await redis.lrange('invoice:list', 0, 99).catch(() => []);

    if (!ids || !ids.length) {
      return res.status(200).json({ invoices: [], total: 0 });
    }

    const records = await Promise.all(
      ids.map(id =>
        redis.get(`invoice:${id}`).then(r =>
          r ? (typeof r === 'string' ? JSON.parse(r) : r) : null
        )
      )
    );

    const data = records.filter(Boolean);

    return res.status(200).json({
      invoices: data,
      total: data.length
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
