# COURSE-02 — Progressive course-body loading

Date: 2026-08-29

## Scope

- Keeps the public catalogue on compact `courseCatalog.ts` metadata only.
- Loads Markdown for one requested core course or one Course/15 course on demand; the catalogue no longer imports every course outline, chapter, and lesson.
- Uses the locale embedded in a public URL as the source of truth while i18next finishes synchronizing. This removes the direct-link race that could render an existing course as not found.
- Keeps an incomplete Course/15 locale fail-closed: the route redirects to the Simplified Chinese source instead of rendering Chinese material at an English, French, Spanish, or Traditional Chinese URL.
- Marks those unavailable localized Course/15 landing and lesson URLs `noindex,nofollow` and suppresses their hreflang alternates until a complete learner-facing corpus exists.

## Validation

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run verify:localized-seo` | Passed — `zh-CN` and `en` are the reviewed indexable locales; lowercase URL segments and hreflang gate are intact. |
| `npm run verify:seo-foundation` | Passed — sitemap, alternate, and quality gate checks passed. |
| `npm run verify:public-pages` | Passed — public routes, original-course count, five UI locales, robots, and contact form checks passed. |
| `npm run verify:course-progressive-loading` | Passed — core and Course/15 globs are lazy; incomplete locales fail closed; source fallback and SEO noindex rules are present. |
| `npm run build` | Passed. |
| `npm run verify:course-bundle` | Passed — lazy course-content chunk `courseAnalytics-DEAcBhDU.js` is 436,520 bytes, under the 500,000-byte regression threshold. The pre-refactor local course-content bundle was about 10.15 MB. |
| Production-preview Playwright suite | Passed 16/16, including Course/15 on-demand loading, English fallback, direct English core course rendering, course-creator to My Courses recovery, logo navigation, public pages, and interview routes. |
| `wrangler@4.127.1 deploy --dry-run` | Passed with `studyainow-db`, `studyainow-storage`, Vectorize, Workers AI, and production origin bindings. No D1 migration is required. |

## Known boundaries

- A Vite development server serves sibling Markdown source files as `text/markdown`; it cannot exercise dynamic raw imports as JavaScript modules. The route tests therefore deliberately use `vite preview` against the production build, which compiles each Markdown file into a safe lazy JavaScript chunk.
- Other independently large feature chunks remain (notably interview, chart, PDF, and resume dependencies). They are outside this course-body release and remain candidates for later route-level splitting.
- Course/15 translation publication remains guarded by the curriculum localization pipeline. This release does not claim full non-Chinese Course/15 copy.

## Production verification

Deployed `studyainow-web` version `bacca65a-a732-40b2-81f3-29d066ba00a1` to `studyai.now/*`.

| Check | Result |
| --- | --- |
| `/zh-cn` | Loaded the course catalogue with no page errors and did **not** request the `courseAnalytics-*` Markdown route chunk. |
| `/zh-cn/courses/agent-engineering` | Loaded `Agent 工程实战` with no page errors and requested the course Markdown chunk only after navigating to the course. |
| `/en/courses/agent-engineering` | Redirected to `/zh-cn/courses/agent-engineering`, preserving the source language rather than showing Chinese content at an English URL. |
| `/en/courses/claude-code-guide` | Stayed on the English URL and rendered `Claude Code: Practical Guide` with no page errors. |
| Server HTML metadata | Chinese Course/15 route reports `index,follow`; incomplete English Course/15 route reports `noindex,nofollow`; complete English core course reports `index,follow`. |

## Rollback

Revert this release and redeploy the preceding Worker version. There is no schema change, data rewrite, or content deletion.
