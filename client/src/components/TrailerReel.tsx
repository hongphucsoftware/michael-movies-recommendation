import { useMemo, useState } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { bestImageUrl, toFeatureVector } from "../hooks/useEnhancedCatalogue";

// cosine + MMR reimplemented locally for independence
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

function mmrPick(pool: Title[], userVec: number[], k = 12, lambda = 0.7): Title[] {
  const chosen: Title[] = [];
  const remaining = pool.map(t => ({...t, feature: t.feature || toFeatureVector(t)}));
  while (chosen.length < k && remaining.length) {
    let best: { item: Title; score: number } | null = null;
    for (const item of remaining) {
      const f = item.feature!;
      const rel = cosine(f, userVec);
      const div = chosen.length === 0 ? 0 : Math.max(...chosen.map(c => cosine(f, c.feature || toFeatureVector(c))));
      const score = lambda * rel - (1 - lambda) * div;
      if (!best || score > best.score) best = { item, score };
    }
    if (!best) break;
    chosen.push(best.item);
    const idx = remaining.findIndex(r => r.id === best!.item.id);
    if (idx >= 0) remaining.splice(idx, 1);
  }
  return chosen;
}

type Props = {
  items: Title[];
  learnedVec: number[];
  count?: number;
};

export default function TrailerReel({ items, learnedVec, count = 8 }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const picks = useMemo(() => mmrPick(items, learnedVec, count), [items, learnedVec, count]);

  async function play(i: number) {
    setLoading(true);
    setActiveIdx(i);
    try {
      const res = await fetch(`/api/trailer?id=${picks[i].id}`);
      const json = await res.json();
      setActiveUrl(json.trailer?.url || null);
    } catch {
      setActiveUrl(null);
    }
    setLoading(false);
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-3">Your Trailer Reel</h2>

      {/* Thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {picks.map((t, i) => (
          <button
            key={t.id}
            onClick={() => play(i)}
            className={`rounded-xl overflow-hidden shadow hover:shadow-lg transition ${
              i === activeIdx ? "ring-2 ring-cyan-400" : ""
            }`}
            title={`Play trailer: ${t.title}`}
          >
            <img
              src={bestImageUrl(t) || ""}
              alt={t.title}
              className="w-full h-64 object-cover"
              loading="lazy"
            />
            <div className="p-2 text-sm font-medium text-left">{t.title}</div>
          </button>
        ))}
      </div>

      {/* Player */}
      <div className="mt-6">
        {loading && <div className="text-sm opacity-80">Loading trailer…</div>}
        {!loading && activeUrl && isYouTube(activeUrl) && (
          <div className="aspect-video w-full">
            <iframe
              className="w-full h-full rounded-xl"
              src={toYouTubeEmbed(activeUrl)}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}
        {!loading && activeUrl && !isYouTube(activeUrl) && (
          <div className="text-sm">
            Trailer URL:{" "}
            <a className="underline" href={activeUrl} target="_blank" rel="noreferrer">
              Open in new tab
            </a>
          </div>
        )}
        {!loading && activeIdx !== null && !activeUrl && (
          <div className="text-sm opacity-80">No trailer available for this title.</div>
        )}
      </div>
    </div>
  );
}

function isYouTube(u: string) {
  return /youtube\.com|youtu\.be/.test(u);
}
function toYouTubeEmbed(u: string) {
  const m = u.match(/v=([^&]+)/);
  const id = m ? m[1] : u.split("/").pop();
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}