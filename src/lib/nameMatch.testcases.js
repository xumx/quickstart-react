// Ad-hoc test cases for slugify and findBestAssistantId
// Usage: import and run runNameMatchTestcases() in a dev environment
//   import { runNameMatchTestcases } from './nameMatch.testcases'
//   runNameMatchTestcases()

import { slugify, findBestAssistantId } from './nameMatch';

export const runNameMatchTestcases = () => {
  const assistants = {
    // store by slug (this mirrors how the app stores them)
    'kira': 'ID_KIRA',
    'alpha-bot': 'ID_ALPHA',
    'bracket-bot-2': 'ID_BRACKET2',
    'bracket-bot-3': 'ID_BRACKET3',
    'sales-demo': 'ID_SALES',
    'sha-agent': 'ID_SHA',
    'gotham-fc-inbound': 'ID_GOTHAM_IN',
    'gotham-fc-outbound': 'ID_GOTHAM_OUT',
    'demo-intake-us': 'ID_INTAKE_US',
    'demo-intake-aus': 'ID_INTAKE_AUS',
  };

  const cases = [
    // Exact, case, spaces, punctuation
    { input: 'kira', expectSlug: 'kira', expectId: 'ID_KIRA' },
    { input: 'Kira', expectSlug: 'kira', expectId: 'ID_KIRA' },
    { input: ' Kira  ', expectSlug: 'kira', expectId: 'ID_KIRA' },

    // Dashes, underscores, punctuation, brackets
    { input: 'Alpha Bot', expectSlug: 'alpha-bot', expectId: 'ID_ALPHA' },
    { input: 'alpha_bot', expectSlug: 'alpha-bot', expectId: 'ID_ALPHA' },
    { input: 'alpha.bot!!', expectSlug: 'alpha-bot', expectId: 'ID_ALPHA' },
    { input: '[Bracket] Bot (2)', expectSlug: 'bracket-bot-2', expectId: 'ID_BRACKET2' },

    // Single-character typos on a long enough slug still resolve
    { input: 'alpha-bpt', expectSlug: 'alpha-bpt', expectId: 'ID_ALPHA', note: 'one substitution' },
    { input: 'alpha-bot-x', expectSlug: 'alpha-bot-x', expectId: undefined, note: 'trailing variant token, not a typo' },

    // --- Guards against resolving to the WRONG assistant ---

    // The bug this file exists for: BOA Agent renamed in Vapi, snapshot stale.
    // Old matcher returned SHA agent (Levenshtein 2, budget 3).
    { input: 'BOA Agent', expectSlug: 'boa-agent', expectId: undefined, note: 'must NOT match sha-agent' },

    // Prefix matching is gone: it used to swallow the more specific slug.
    { input: 'alpha', expectSlug: 'alpha', expectId: undefined, note: 'too short to fuzzy match' },
    { input: 'sales', expectSlug: 'sales', expectId: undefined, note: 'no prefix matching' },
    { input: 'sales-demo', expectSlug: 'sales-demo', expectId: 'ID_SALES', note: 'exact still works' },

    // Digits distinguish variants, never typos
    { input: 'bracket-bot-4', expectSlug: 'bracket-bot-4', expectId: undefined, note: 'no digit swapping' },

    // Ambiguity resolves to nothing rather than a coin flip
    { input: 'gotham-fc-inbuond', expectSlug: 'gotham-fc-inbuond', expectId: undefined, note: 'two edits from either gotham slug' },

    // Short trailing tokens are region codes, not words
    { input: 'demo-intake-ues', expectSlug: 'demo-intake-ues', expectId: undefined, note: 'us/aus not interchangeable' },

    // Short slugs never fuzzy match (acronyms are different clients)
    { input: 'kria', expectSlug: 'kria', expectId: undefined, note: 'below MIN_FUZZY_LENGTH' },

    // Unresolvable
    { input: 'unknown-assistant', expectSlug: 'unknown-assistant', expectId: undefined },
  ];

  let passed = 0;
  cases.forEach((c, idx) => {
    const slug = slugify(c.input);
    const id = findBestAssistantId(assistants, slug);
    const okSlug = c.expectSlug === undefined || slug === c.expectSlug;
    const okId = id === c.expectId;
    const ok = okSlug && okId;
    if (ok) passed++;
    // eslint-disable-next-line no-console
    console.log(
      `${ok ? '✅' : '❌'} [${idx + 1}] input="${c.input}" slug="${slug}" => id=${id} ` +
      (c.note ? `(${c.note})` : ''),
    );
    if (!ok) {
      // eslint-disable-next-line no-console
      console.log('   Expected:', { expectSlug: c.expectSlug, expectId: c.expectId });
    }
  });
  // eslint-disable-next-line no-console
  console.log(`\n${passed}/${cases.length} testcases passed`);
};
