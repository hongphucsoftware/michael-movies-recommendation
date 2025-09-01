// client/src/lib/videoPick.ts
// Robust trailer + poster picking shared by imdbService & catalogueService

export function pickBestYouTubeVideo(results: any[]): any | null {
  const YT = (results || []).filter((r: any) => r.site === "YouTube");
  if (!YT.length) return null;

  const score = (v: any) => {
    const n = (v.name || "").toLowerCase();
    let s = 0;
    if (v.type === "Trailer") s += 6;
    if (v.official === true) s += 5;
    if (/\bofficial\b/.test(n)) s += 3;
    if (/\btrailer\b/.test(n)) s += 2;
    if (v.size >= 1080) s += 2; else if (v.size >= 720) s += 1;
    if (/\bteaser\b/.test(n)) s -= 2;
    if (/\bclip\b/.test(n)) s -= 3;
    if (/\bspot\b/.test(n)) s -= 2;
    return s;
  };

  return YT.map(v => ({ v, s: score(v) }))
           .sort((a, b) => b.s - a.s)[0]?.v || null;
}

export function posterFromTMDbPaths(obj: any): string | null {
  const p = obj?.poster_path || null;
  if (p) return `https://image.tmdb.org/t/p/w500${p}`;        // prefer posters (avoid cropped backdrops)
  // DO NOT use backdrop_path - it causes cropping issues
  return null;    // force fallback to YouTube thumbnail instead of using backdrop
}

export function youtubeThumb(ytKey: string): string {
  return `https://i.ytimg.com/vi/${ytKey}/sddefault.jpg`;
}