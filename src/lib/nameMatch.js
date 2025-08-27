// Utility for assistant name normalization and fuzzy matching

// Create a URL-safe slug from a name (lowercase, alphanumerics and single dashes)
export const slugify = (str) => {
  try {
    return (str || "")
      .toString()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // strip diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> dash
      .replace(/(^-|-$)/g, "") // trim dashes
      .replace(/-{2,}/g, "-"); // collapse dashes
  } catch {
    return "";
  }
};

// Lightweight Levenshtein distance for fuzzy matching
export const levenshtein = (a = "", b = "") => {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,      // deletion
        dp[j - 1] + 1,  // insertion
        prev + cost     // substitution
      );
      prev = temp;
    }
  }
  return dp[n];
};

// Find best matching assistant ID by slug or fuzzy match
export const findBestAssistantId = (assistantMap, querySlug) => {
  if (!assistantMap || !querySlug) return undefined;
  if (assistantMap[querySlug]) return assistantMap[querySlug];

  const keys = Object.keys(assistantMap);
  // Heuristic 1: prefix/substring match on slug
  const prefixHit = keys.find(k => k.startsWith(querySlug) || querySlug.startsWith(k));
  if (prefixHit) return assistantMap[prefixHit];

  // Heuristic 2: Levenshtein distance threshold (len-based)
  let bestKey = null;
  let bestDist = Infinity;
  for (const k of keys) {
    const d = levenshtein(k, querySlug);
    if (d < bestDist) {
      bestDist = d;
      bestKey = k;
    }
  }
  const maxAllowed = Math.max(1, Math.floor(Math.min(querySlug.length, (bestKey || "").length) * 0.34));
  if (bestKey && bestDist <= maxAllowed) return assistantMap[bestKey];
  return undefined;
};
