// Vercel serverless function for /api/next-seed

// Import full SEED data
import { SEED_LIST_1, SEED_LIST_2 } from './seed-data.js';

// Global variable to track current seed list (shared with catalogue)
let currentSeedIndex = 0;

// Vercel serverless function handler
export default (req, res) => {
  try {
    // Set headers
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    
    // Switch to next seed list
    currentSeedIndex = (currentSeedIndex + 1) % 2;
    const seedName = currentSeedIndex === 0 ? "List 1" : "List 2";
    const seedId = currentSeedIndex === 0 ? "ls094921320" : "ls003501243";
    
    res.status(200).json({
      ok: true,
      seedIndex: currentSeedIndex,
      seedName: seedName,
      seedId: seedId,
      message: `Switched to ${seedId}`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
