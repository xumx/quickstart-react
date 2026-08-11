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

// Minimum slug length before fuzzy matching is allowed. Short slugs are mostly
// acronyms (nba / wnba / nbl / anz / ana) where one edit is a different client,
// not a typo.
const MIN_FUZZY_LENGTH = 6;

// Final tokens shorter than this are treated as variant codes (us / aus / v2 /
// sg) rather than words, so a one-edit difference there is never a typo.
const VARIANT_TOKEN_LENGTH = 4;

const digitsOf = (slug) => (slug.match(/\d/g) || []).join("");
const lastToken = (slug) => slug.split("-").pop() || "";

// Is `candidate` close enough to `query` that the difference is plausibly a
// typo rather than a genuinely different assistant?
const isPlausibleTypo = (candidate, query) => {
  if (levenshtein(candidate, query) > 1) return false;

  // demo1 vs demo2, v2 vs v3 — digits distinguish variants, never typos.
  if (digitsOf(candidate) !== digitsOf(query)) return false;

  // demo-intake-us vs demo-intake-aus — adding or dropping a character in a
  // short trailing token is a region/variant code, not a typo. A substitution
  // of the same length (alpha-bot vs alpha-bpt) still reads as a typo.
  const a = lastToken(candidate);
  const b = lastToken(query);
  if (a !== b && a.length !== b.length &&
      (a.length < VARIANT_TOKEN_LENGTH || b.length < VARIANT_TOKEN_LENGTH)) return false;

  return true;
};

// Find the assistant ID for a slug.
//
// Exact match first, then a deliberately narrow typo tolerance. The old
// implementation allowed prefix matches plus a Levenshtein budget of 34% of the
// slug length — three edits on a nine-character slug. Against the ~615 live
// assistant names that silently resolved 245 of them to a DIFFERENT customer's
// assistant whenever the requested slug was missing (e.g. a rename that had not
// propagated to voice-assistants.json): `boa-agent` -> `sha-agent`,
// `gotham-fc-inbound` -> `gotham-fc-outbound`, `schdemo-cantonese` -> `schdemo`.
//
// Serving the wrong assistant is worse than serving none, so a fuzzy match is
// only returned when exactly one candidate qualifies. Ambiguity resolves to
// undefined and the caller shows "no assistant matching this URL".
export const findBestAssistantId = (assistantMap, querySlug) => {
  if (!assistantMap || !querySlug) return undefined;
  if (assistantMap[querySlug]) return assistantMap[querySlug];
  if (querySlug.length < MIN_FUZZY_LENGTH) return undefined;

  const matches = Object.keys(assistantMap).filter((key) => isPlausibleTypo(key, querySlug));
  return matches.length === 1 ? assistantMap[matches[0]] : undefined;
};
