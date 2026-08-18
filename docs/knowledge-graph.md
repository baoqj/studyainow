# Skills knowledge graph

For the D1 graph model, review policy, production preview and read-only audit queries, see [the technical review manual](./knowledge-graph-technical.md).

The graph separates model suggestions from public learning guidance:

```text
JD / published course chapter or lesson / reviewed creator course
  -> refresh queue
  -> configured LLM analysis
  -> pending skill and relationship candidates
  -> admin approval
  -> public JD evidence, lesson coverage, and skill relations
```

Existing dictionary matches remain available as deterministic evidence. LLM output never becomes public until an admin approves the specific candidate.

## Provider configuration

The production Worker automatically selects `LLM_DEEPSEEK_API` first and `LLM_MEGANOVA_API` second. It uses `deepseek-v4-pro` and, on failover, `openai/gpt-5.4`; either model can be overridden without changing code.

```bash
npx wrangler secret put SKILL_GRAPH_DEEPSEEK_MODEL # optional: deepseek-v4-flash
npx wrangler secret put SKILL_GRAPH_MEGANOVA_MODEL # optional: zai-org/GLM-5.1, moonshotai/Kimi-K2-Thinking, etc.
```

For another OpenAI-compatible provider, set these Worker secrets. The endpoint must be a full HTTPS OpenAI-compatible `chat/completions` URL.

```bash
npx wrangler secret put SKILL_GRAPH_LLM_PROVIDER
npx wrangler secret put SKILL_GRAPH_LLM_ENDPOINT
npx wrangler secret put SKILL_GRAPH_LLM_MODEL
npx wrangler secret put SKILL_GRAPH_LLM_API_KEY
```

`SKILL_GRAPH_LLM_API_KEY` can be omitted only when the provider-specific Worker secret is present: `OPENAI_API_KEY`, `MEGANOVA_API_KEY`, `DEEPSEEK_API_KEY`, `ZHIPU_API_KEY`, or `KIMI_API_KEY`.

Without either of the configured production provider secrets, or a complete generic provider configuration, the queue remains pending and the Worker makes no model request.

## Operations

- The 12-hour crawl discovers official jobs and changed course sources. A separate two-minute graph-only backfill trigger processes up to 16 queued analyses at a time, with at most three concurrent provider requests per trigger; it prioritizes course units and does not crawl job boards.
- `POST /api/admin/knowledge-graph/refresh` performs a bounded, authenticated refresh on demand.
- `GET /api/admin/knowledge-graph?status=pending` lists skills and relation candidates.
- `POST /api/admin/knowledge-graph/candidates/:id/review` accepts `{ "decision": "approved" | "rejected", "kind": "skill" | "relation", "note": "..." }`.

When a new skill is approved, current published JD versions are queued again. When course coverage is approved, every existing JD that already evidences that skill picks up the new lesson mapping through `lesson_skill_coverage` immediately.
