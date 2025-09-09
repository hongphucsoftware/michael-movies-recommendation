// Replit Agent: This banner MUST show the live total from the server, not a hardcoded number.
import { useEffect, useState } from "react";

function DataBanner() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    // Pull the full count (and force-build if needed)
    fetch("/api/catalogue")
      .then(r => r.json())
      .then(j => setTotal(j?.total ?? null))
      .catch(() => setTotal(null));
  }, []);

  return (
    <div className="text-xs opacity-70">
      Using the complete Rotten Tomatoes 2020, IMDb Top 250, and IMDb list —{" "}
      {total === null ? "loading…" : `${total} titles (deduped)`}
    </div>
  );
}

export default DataBanner;