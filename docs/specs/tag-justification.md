# Tag Justification Generation

**Status:** implementation-ready

## Goal

Add an LLM-assisted, review-only workflow that asks OpenAI Luna to evaluate tags and stores the returned plain-text justification in `Tag.justification`. The workflow must never delete tags and must not overwrite an existing justification.

## Boundaries

- `apps/internal-worker/` owns tag selection, database reads, weight calculations, and enqueueing work.
- `apps/llm-worker/` owns the OpenAI request, response validation, database persistence, and Telegram success notification. Direct persistence in `llm-worker` is an approved exception to the repository database-coordination rule and intentionally follows the existing tag-description operation.
- `packages/schemata/` owns the shared BullMQ payload schema.
- `packages/queues/` continues to own `llmQueue`, native deduplication, retry defaults, queue limits, worker limiting, and shutdown.
- No schema migration is required; `Tag.justification` already exists in the generated `DB` type.

## Exact Target Paths

Implementation is limited to:

1. `packages/schemata/src/index.ts`
2. `packages/schemata/src/index.test.ts`
3. `apps/internal-worker/src/database2/get-tags-needing-justification.ts`
4. `apps/internal-worker/src/database2/get-tags-needing-justification.test.ts`
5. `apps/internal-worker/src/database2/read-tag-justification-context.ts`
6. `apps/internal-worker/src/database2/read-tag-justification-context.test.ts`
7. `apps/internal-worker/src/operations/add-work/llm.ts`
8. `apps/internal-worker/src/operations/add-work/llm.test.ts` (create if absent)
9. `apps/llm-worker/src/tag-justification-prompt.ts`
10. `apps/llm-worker/src/database2/save-tag-justification.ts`
11. `apps/llm-worker/src/operations/generate-tag-justification.ts`
12. `apps/llm-worker/src/operations/generate-tag-justification.test.ts`
13. `apps/llm-worker/src/operations/index.ts`

Do not add a second save job, queue, database column, trigger-window check, deletion operation, or structured result column.

## Queue Routing

Use the existing `llmQueue` and add the operation name `tag:justification:generate`. `apps/internal-worker/src/operations/add-work/llm.ts` must enqueue at most one justification job per invocation of `add-work`. The job identity is the tag name, so existing BullMQ native deduplication remains effective for pending jobs.

The existing description jobs may continue to use remaining LLM capacity. The implementation must reserve one slot for justification work only when an eligible tag exists, then use the remaining capacity for descriptions. If no eligible tag exists, description capacity is unchanged.

Preserve the existing LLM queue defaults, retry/backoff behavior, worker limiter, timeout, queue capacity checks, and generated job-ID mechanism.

## Input Contract

Add a shared schema and type for the generation payload with this shape:

```json
{
  "target_tag": { "name": "string", "weight": "number" },
  "top_artists": ["string"],
  "adjacent_tags": [{ "name": "string", "weight": "number" }]
}
```

Names must be non-empty strings. Weights must be finite numbers. `adjacent_tags` must contain no more than 10 entries. The payload is validated at the LLM operation boundary before database or provider work.

## Operations

### Internal selection

`get-tags-needing-justification.ts` must select only tags with:

- `justification IS NULL`;
- `listUpdatedAt IS NOT NULL`;
- the same eligibility/freshness policy used for description work unless a narrower policy is required by the existing query.

The query must return at most one tag for each `add-work` run. Eligibility is exactly `justification IS NULL`, `listUpdatedAt IS NOT NULL`, and `listUpdatedAt <= NOW() - interval '24 hours'`, matching `get-descriptionless-tags.ts`.

### Context calculation

`read-tag-justification-context.ts` must calculate the target tag weight and every adjacent-tag weight with the identical formula:

```sql
SUM(
  "Album"."playcount"::FLOAT / 1000
  * "Album"."listeners" / 100
  * "AlbumTag"."count"
)
```

The target query must join `AlbumTag` to `Album` by artist/name, filter by the target tag name, exclude hidden albums and `Various Artists`, group the target tag, and calculate the formula above. Because SQL arithmetic with nullable playcount/listener values yields null, the aggregate must preserve that uncertainty; do not replace either value with a fabricated zero. If the target aggregate is null, context generation must fail and the LLM job must not be enqueued. Related rows with null aggregates are excluded before ordering; the payload must contain only finite weights.

Adjacent tags must use the supplied correlated join pattern:

- correlate `first_tag.tagName` with the target tag;
- join `second_tag` on album artist/name;
- join `Tag as second_tag_tag`;
- require `second_tag_tag.listUpdatedAt IS NOT NULL`;
- exclude the target tag itself;
- group by `second_tag.tagName`;
- order by the calculated weight descending;
- limit to 10.

The adjacent-tag calculation must use the target-weight formula above, not the existing listener-only related-tag weight.

Top artists may reuse the existing artist query and existing limit of 30 unless tests or query constraints require a focused equivalent.

### LLM operation

`generate-tag-justification.ts` must:

1. Validate `job.data` with the shared payload schema.
2. Check the target tag blacklist using existing behavior.
3. Start the existing database transaction pattern.
4. Read the current `Tag.justification`.
5. If it is non-null, complete without calling OpenAI, saving, or notifying.
6. Call OpenAI Responses API with model exactly `gpt-5.6-luna`.
7. Pass the approved system prompt and JSON user input containing the target tag, top artists, and weighted adjacent tags.
8. Validate the provider response as non-empty plain text.
9. Save the text to `Tag.justification` only while the column is null.
10. Treat a zero-row conditional update as a conflict and do not overwrite the existing value.
11. Enqueue a Telegram success report only after a successful database update.

The OpenAI call must follow the existing description implementation pattern, including its transaction scope, because the requested architecture exception explicitly approves this behavior.

## System Prompt

`tag-justification-prompt.ts` must contain the approved system message, adapted only to identify the task as tag evaluation. It must preserve these rules:

- a tag requires a theoretical sonic identity;
- duplicate tags are resolved in favor of the higher-weight tag;
- niche microgenres are acceptable;
- ambiguous names must be flagged in the memo;
- unknown terms must not be inferred from artists;
- artists are evidence, not authoritative taxonomy.

The model must return only the final plain-text justification. No JSON output, decision field, or structured response contract is required.

## Telegram Reporting

After successful persistence, enqueue the existing Telegram `post` operation through `telegramQueue`. The report must be a readable HTML-formatted summary containing the tag, all top artists, all adjacent tag names without weights, and the generated justification. Escape dynamic values through the existing Telegram escaping convention. The Telegram enqueue must occur after the database update, never before it.

<Architecture>

The new route is `internal-worker -> llmQueue -> llm-worker -> Tag update + telegramQueue`. `internal-worker` owns all context queries and sends a complete, validated-ready payload so the LLM worker does not need to reconstruct target or adjacent weights. `llm-worker` owns `tag:justification:generate`, OpenAI Luna invocation, the null guard, persistence, and success notification.

Add the smallest reusable query helpers at the exact paths listed above. Use `kysely-codegen` `DB` types, existing Kysely transaction conventions, Valibot schemas from `packages/schemata`, and ESM relative imports with `.js` extensions. Do not use unchecked production assertions, `any`, non-null assertions, or TypeScript suppression comments.

No new queue or save operation is permitted. At most one justification job is produced by one `add-work` execution; native BullMQ deduplication handles duplicate pending identities. Tags with a non-null justification are excluded by selection and guarded again immediately before the provider call.

</Architecture>

<DataFlow>

1. `add-work` obtains existing LLM queue capacity.
2. It selects at most one tag whose `justification` is null and whose list is ready.
3. It calculates the target weight, top artists, and up to ten adjacent tags.
4. It creates `tag:justification:generate` with tag-name identity and the shared payload.
5. Existing description work receives only capacity remaining after the justification slot.
6. BullMQ delivers the job to `llm-worker`.
7. The operation validates the payload before business logic.
8. The operation checks blacklist status and current persisted justification.
9. A non-null justification causes an idempotent no-op.
10. Otherwise, the operation calls OpenAI Luna with the approved system prompt and serialized JSON input.
11. Non-empty response text is saved with a conditional `justification IS NULL` update.
12. A conflicting update fails without overwriting the newer value.
13. A successful update enqueues one Telegram success post.
14. Queue retry, deduplication, worker limiting, and shutdown remain governed by existing infrastructure.

</DataFlow>

<FailureModes>

- Invalid queue payload: reject before database or OpenAI work; classify as deterministic validation failure.
- Tag already justified before execution: complete without provider call, update, or Telegram report.
- Tag becomes justified during generation: conditional update affects zero rows; raise a conflict and never overwrite.
- Missing target weight: do not fabricate a value; fail context generation rather than sending incomparable evidence.
- Missing playcount/listener data: preserve existing SQL null semantics and reject or omit only according to the tested query contract.
- No artists or adjacent tags: send empty arrays; this is valid incomplete evidence.
- Empty or malformed OpenAI response: fail before persistence and notification.
- OpenAI timeout, rate limit, or service error: use existing BullMQ retry behavior; do not add another retry loop.
- Database failure: do not report success.
- Telegram enqueue failure after persistence: the database write remains successful; Telegram handling follows its own existing queue retry behavior.
- Duplicate pending generation jobs: native BullMQ deduplication suppresses duplicates using the existing identity mechanism.
- A single `add-work` invocation: must never produce more than one justification-generation job, regardless of the number of eligible tags.

</FailureModes>

<TestPlan>

### Schema tests

Update `packages/schemata/src/index.test.ts` to assert acceptance of valid payloads and rejection of missing fields, empty names, non-finite weights, and more than ten adjacent tags.

### Internal-worker tests

`get-tags-needing-justification.test.ts` must assert null-only selection and one-row limitation.

`read-tag-justification-context.test.ts` must assert the target and adjacent calculations use the same playcount/listener/count formula, adjacent exclusion, list-ready filtering, descending ordering, ten-item limit, and empty-result behavior.

`add-work/llm.test.ts` must assert at most one justification job, the exact operation name and identity, correct payload construction, native deduplication options, and correct remaining description capacity.

### LLM-worker tests

`generate-tag-justification.test.ts` must assert:

- invalid payloads stop before OpenAI;
- blacklisted tags stop before provider work;
- existing justification skips provider, save, and Telegram;
- the exact model is `gpt-5.6-luna`;
- the system prompt and JSON input contain weighted target and adjacent tags;
- valid plain text is saved;
- empty or malformed output is not saved;
- a non-null conditional-update conflict does not overwrite or report success;
- successful persistence enqueues exactly one Telegram post;
- provider failures propagate for existing queue retry behavior.

Mocks may use casts only for test fixtures and dependencies. Raw invalid payloads and provider responses must pass through real validation paths.

### Required verification

After implementation, run from the repository root:

```text
pnpm lint --fix
pnpm test --run
pnpm build
```

All three commands must pass.

</TestPlan>

## Acceptance Criteria

- `docs/specs/tag-justification.md` is the implementation specification for this feature.
- Target and adjacent weights use the identical approved formula.
- One `add-work` run enqueues at most one justification job.
- Tags with existing justification are not selected and are guarded before OpenAI.
- No `tag:justification:save` job exists.
- The LLM operation saves directly to `Tag.justification`.
- Existing values are never overwritten.
- Output is plain text and non-empty.
- Successful writes generate a Telegram success report.
- No automatic deletion occurs.
- Existing description generation and queue behavior remain intact.

## Compatibility Impact

This adds a new LLM operation and shared payload contract without changing existing queue names, retry settings, worker limits, or description payloads. The new operation directly writes the already-present `Tag.justification` column. The approved database-boundary exception applies only to this requested LLM persistence pattern.
