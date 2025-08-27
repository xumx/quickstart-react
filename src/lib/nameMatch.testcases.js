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
    'sales-demo': 'ID_SALES',
  };

  const cases = [
    // Exact, case, spaces, punctuation
    { input: 'kira', expectSlug: 'kira', expectId: 'ID_KIRA' },
    { input: 'Kira', expectSlug: 'kira', expectId: 'ID_KIRA' },
    { input: ' Kira  ', expectSlug: 'kira', expectId: 'ID_KIRA' },
    { input: 'Kíraî', expectSlug: 'kirai', expectId: 'ID_KIRA', note: 'diacritics removed, fuzzy ok' },

    // Dashes, underscores, punctuation, brackets
    { input: 'Alpha Bot', expectSlug: 'alpha-bot', expectId: 'ID_ALPHA' },
    { input: 'alpha_bot', expectSlug: 'alpha-bot', expectId: 'ID_ALPHA' },
    { input: 'alpha.bot!!', expectSlug: 'alpha-bot', expectId: 'ID_ALPHA' },
    { input: '[Bracket] Bot (2)', expectSlug: 'bracket-bot-2', expectId: 'ID_BRACKET2' },

    // Substring and prefix matches
    { input: 'alpha', expectSlug: 'alpha', expectId: 'ID_ALPHA', note: 'prefix match to alpha-bot' },
    { input: 'sales', expectSlug: 'sales', expectId: 'ID_SALES', note: 'prefix match to sales-demo' },
    { input: 'sales-demo', expectSlug: 'sales-demo', expectId: 'ID_SALES' },

    // Minor typos (Levenshtein)
    { input: 'kriA', expectSlug: 'kria', expectId: 'ID_KIRA' },
    { input: 'alhpa-bot', expectSlug: 'alhpa-bot', expectId: 'ID_ALPHA' },
    { input: 'bracket-b0t-2', expectSlug: 'bracket-b0t-2', expectId: 'ID_BRACKET2' },

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
