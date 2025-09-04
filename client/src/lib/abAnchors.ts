
import type { Title } from "../hooks/useEnhancedCatalogue";

const CLUSTERS: Record<string, number[]> = {
  Action: [28, 12, 53], // Action, Adventure, Thriller
  ComedyRomance: [35, 10749], // Comedy, Romance  
  Drama: [18], // Drama
  Horror: [27, 53], // Horror, Thriller
  AnimationFamily: [16, 10751], // Animation, Family
  ScifiFantasy: [878, 14], // Sci-Fi, Fantasy
  CrimeMystery: [80, 9648], // Crime, Mystery
};

function clusterOf(t: Title) {
  const gs = t.genres || [];
  let best = "Drama", bestOverlap = -1;
  for (const [name, ids] of Object.entries(CLUSTERS)) {
    const overlap = gs.filter(g => ids.includes(g)).length;
    if (overlap > bestOverlap) { 
      best = name; 
      bestOverlap = overlap; 
    }
  }
  return best;
}

function yearOf(t: Title) {
  const y = (t as any).year || (t as any).release_date || (t as any).releaseDate || "";
  return typeof y === "string" ? Number(y.slice(0,4)) || null : (typeof y === "number" ? y : null);
}

// "Knownness": IMDb Top 250 gets a boost; popularity & vote_count help
function knownness(t: Title) {
  const src = t.sources || [];
  const imdbTop = src.includes("imdbTop") ? 1.5 : 0;
  const imdbList = src.includes("imdbList") ? 0.5 : 0;
  const pop = Math.min(60, Math.max(0, Number(t.popularity || 0))) / 60; // 0..1
  const votes = Math.min(1, (t.vote_count || 0) / 20000);
  return imdbTop + imdbList + 0.8 * pop + 0.5 * votes;
}

// Keep A/B anchors English-first (reduces confusion)
function isEnglishish(t: Title) {
  const lang = (t as any).original_language || (t as any).originalLanguage || "en";
  return lang === "en";
}

export type Anchor = Title & { 
  cluster: string; 
  knownness: number; 
  decade: number;
};

export function buildABAnchors(full: Title[], maxPerCluster = 30): Anchor[] {
  // 1) Prefilter: recognizable + English + has poster
  const pool = full.filter(t => 
    knownness(t) >= 0.6 && 
    isEnglishish(t) && 
    (t.poster || t.image || (t as any).poster_path)
  );

  console.log(`[AB ANCHORS] Filtered to ${pool.length} recognizable English movies from ${full.length} total`);

  // 2) Rank by "knownness" inside cluster
  const byCluster: Record<string, Anchor[]> = {};
  for (const t of pool) {
    const c = clusterOf(t);
    const y = yearOf(t) || 2000;
    const decade = Math.floor(y / 10) * 10; // 1970, 1980, etc
    const k = knownness(t);
    
    (byCluster[c] ||= []).push({
      ...t,
      cluster: c,
      knownness: k,
      decade
    });
  }

  // Sort each cluster by knownness
  for (const c of Object.keys(byCluster)) {
    byCluster[c].sort((a, b) => b.knownness - a.knownness);
  }

  // 3) Enforce decade spread per cluster (1970s-2020s if available)
  const decades = [1970, 1980, 1990, 2000, 2010, 2020];
  const anchors: Anchor[] = [];
  
  for (const c of Object.keys(byCluster)) {
    const arr = byCluster[c];
    const taken: Anchor[] = [];

    console.log(`[AB ANCHORS] ${c}: ${arr.length} candidates`);

    // Pick up to 5 per decade first pass for variety
    for (const d of decades) {
      let decadeCount = 0;
      for (const t of arr) {
        if (taken.length >= maxPerCluster) break;
        if (Math.floor((t.decade || 2000) / 10) * 10 === d && 
            !taken.find(x => x.id === t.id)) {
          taken.push(t);
          decadeCount++;
          if (decadeCount >= 5) break; // Max 5 per decade
        }
      }
    }

    // Top up to quota with highest knownness
    for (const t of arr) {
      if (taken.length >= maxPerCluster) break;
      if (!taken.find(x => x.id === t.id)) {
        taken.push(t);
      }
    }

    console.log(`[AB ANCHORS] ${c}: Selected ${taken.length} anchors`);
    anchors.push(...taken.slice(0, maxPerCluster));
  }

  // 4) Brand diversity: avoid multiple entries from same franchise
  const brandSeen = new Set<string>();
  const out: Anchor[] = [];
  
  for (const t of anchors) {
    const title = t.title || "";
    // Simple brand detection - first 2 words after removing articles
    const brand = title.toLowerCase()
      .replace(/^the\s+|^a\s+|^an\s+/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 2)
      .join(" ");
    
    if (brandSeen.has(brand)) continue;
    brandSeen.add(brand);
    out.push(t);
  }

  console.log(`[AB ANCHORS] Final anchor pool: ${out.length} movies across ${Object.keys(byCluster).length} clusters`);
  console.log(`[AB ANCHORS] Cluster breakdown:`, 
    Object.keys(byCluster).map(c => `${c}:${out.filter(t => t.cluster === c).length}`).join(', ')
  );

  return out;
}

// Get anchors for specific A/B testing phases
export function getAnchorsForPhase(anchors: Anchor[], phase: 'broad' | 'focused' | 'precise', topGenres?: string[]) {
  switch (phase) {
    case 'broad':
      // Return variety across all clusters for broad exploration
      const clusters = ['Action', 'ComedyRomance', 'Drama', 'ScifiFantasy', 'Horror', 'AnimationFamily', 'CrimeMystery'];
      return clusters.map(cluster => 
        anchors.filter(a => a.cluster === cluster).slice(0, 8)
      ).flat();
      
    case 'focused':
      // Focus on top 2-3 user-preferred clusters
      if (!topGenres || topGenres.length === 0) return anchors.slice(0, 40);
      
      const focusedClusters = topGenres.map(genre => {
        // Map A/B vector indices to clusters
        switch (genre) {
          case 'comedy': return 'ComedyRomance';
          case 'drama': return 'Drama';
          case 'action': return 'Action';
          case 'thriller': return 'Horror'; // Horror cluster includes thrillers
          case 'scifi': return 'ScifiFantasy';
          case 'fantasy': return 'ScifiFantasy';
          default: return 'Drama';
        }
      });
      
      return focusedClusters.map(cluster =>
        anchors.filter(a => a.cluster === cluster).slice(0, 15)
      ).flat();
      
    case 'precise':
      // Use highest-rated movies from user's preferred clusters
      if (!topGenres || topGenres.length === 0) {
        return anchors.sort((a, b) => b.knownness - a.knownness).slice(0, 30);
      }
      
      const preciseClusters = topGenres.slice(0, 2).map(genre => {
        switch (genre) {
          case 'comedy': return 'ComedyRomance';
          case 'drama': return 'Drama';
          case 'action': return 'Action';
          case 'thriller': return 'Horror';
          case 'scifi': return 'ScifiFantasy';
          case 'fantasy': return 'ScifiFantasy';
          default: return 'Drama';
        }
      });
      
      return preciseClusters.map(cluster =>
        anchors.filter(a => a.cluster === cluster)
          .sort((a, b) => b.knownness - a.knownness)
          .slice(0, 15)
      ).flat();
      
    default:
      return anchors;
  }
}
