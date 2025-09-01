import { useMemo, useState } from "react";
import type { Title } from "../lib/videoPick";
import { buildTrailerWheel, bestImageUrl } from "../lib/videoPick";

type Props = {
  items: Title[];
  learnedVec: number[]; // from useLearnedVector()
  count?: number;
};

export default function TrailerReel({ items, learnedVec, count = 12 }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const wheel = useMemo(() => buildTrailerWheel(items, learnedVec, count), [items, learnedVec, count]);

  async function play(i: number) {
    setLoading(true);
    setActiveIdx(i);
    const { url } = await wheel.loadTrailer(i);
    setActiveUrl(url);
    setLoading(false);
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-3">Your Trailer Reel</h2>

      {/* Thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {wheel.picks.map((t, i) => (
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