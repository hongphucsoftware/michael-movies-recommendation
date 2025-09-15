// Vercel serverless function for /api/audit/capacity

import { SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4, SEED_LIST_5 } from '../seed-data.js';

export default (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const lists = {
      ls094921320: SEED_LIST_1.length,
      ls003501243: SEED_LIST_2.length,
      ls002065120: SEED_LIST_3.length,
      ls000873904: SEED_LIST_4.length,
      ls005747458: SEED_LIST_5.length,
    };

    const total = Object.values(lists).reduce((a, b) => a + b, 0);

    res.status(200).json({ ok: true, lists, total });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


