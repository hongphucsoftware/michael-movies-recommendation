import { Router } from "express";
const api = Router();

// Sample movie data - no external dependencies
const movies = [
  { id: 550, title: "Fight Club", year: 1999, posterUrl: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  { id: 13, title: "Forrest Gump", year: 1994, posterUrl: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg" },
  { id: 238, title: "The Godfather", year: 1972, posterUrl: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg" },
  { id: 424, title: "Schindler's List", year: 1993, posterUrl: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg" },
  { id: 389, title: "12 Angry Men", year: 1957, posterUrl: "https://image.tmdb.org/t/p/w500/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg" },
  { id: 129, title: "Spirited Away", year: 2001, posterUrl: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg" }
];

api.get("/health", (_req, res) => {
  res.json({ ok: true, status: "simplified", movies: movies.length });
});

api.get("/catalogue", (_req, res) => {
  res.json({ 
    ok: true, 
    items: movies,
    total: movies.length,
    sources: ["sample"],
    policy: "simplified"
  });
});

api.get("/catalogue-all", (_req, res) => {
  res.json({ ok: true, totals: { all: movies.length, posters: movies.length } });
});

api.get("/recs", (req, res) => {
  const limit = Number(req.query.top || req.query.limit) || 6;
  const shuffled = [...movies].sort(() => Math.random() - 0.5);
  res.json({ 
    ok: true, 
    items: shuffled.slice(0, limit),
    rounds: 0,
    likes: []
  });
});

api.get("/trailers", (req, res) => {
  const ids = String(req.query.ids || "").split(",").map(Number).filter(Boolean);
  const trailers: Record<number, string> = {
    550: "https://www.youtube.com/embed/SUXWAEX2jlg",
    13: "https://www.youtube.com/embed/bLvqoHBptjg",
    238: "https://www.youtube.com/embed/sY1S34973zA",
    424: "https://www.youtube.com/embed/gG22XNhtnoY",
    389: "https://www.youtube.com/embed/_13J_9B5jEk",
    129: "https://www.youtube.com/embed/ByXuk9QqQkk"
  };
  const result: Record<number, string | null> = {};
  for (const id of ids) {
    result[id] = trailers[id] || null;
  }
  res.json({ ok: true, trailers: result });
});

export default api;