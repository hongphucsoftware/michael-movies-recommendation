// Vercel serverless function for /api/catalogue/capacity

import { SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4, SEED_LIST_5 } from '../seed-data.js';

const SEED_IDS = [
  "ls094921320",
  "ls003501243",
  "ls002065120",
  "ls000873904",
  "ls005747458",
];

export default (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const lists = [SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4, SEED_LIST_5];
    const seeds = lists.map((list, i) => ({
      seedIndex: i,
      seedId: SEED_IDS[i],
      count: list.length,
    }));

    const total = seeds.reduce((acc, s) => acc + s.count, 0);

    res.status(200).json({ ok: true, total, seeds });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


