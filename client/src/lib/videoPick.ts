// client/src/lib/videoPick.ts
// Robust trailer + poster picking shared by imdbService & catalogueService

export function pickBestYouTubeVideo(results: any[]): string[] {
  const YT = (results || []).filter((v: any) => v.site === "YouTube");
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
  return YT.map((v: any) => ({ v, s: score(v) }))
           .sort((a: any, b: any) => b.s - a.s)
           .map((x: any) => x.v.key);
}

export function posterFromTMDbPaths(obj: any): string | null {
  const p = obj?.poster_path || null;
  if (p) return `/img/t/p/w500${p}`; // prefer true posters through proxy
  const b = obj?.backdrop_path || null;
  return b ? `/img/t/p/w500${b}` : null; // fallback only
}

export function youtubeThumb(ytKey: string): string {
  return `https://i.ytimg.com/vi/${ytKey}/sddefault.jpg`;
}