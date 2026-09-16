# Daily report renewal filtering

## Status

Implementation-ready.

## Scope

Align `daily-report` renewal metrics with the existing Last.fm scheduling eligibility rules. Hidden albums are excluded from actionable stats and tag renewal counts. Newly registered hidden albums remain included in the registration activity metric.

Pending and overdue stats/tag metrics use the same actionable renewal population and predicates. Existing state fields are retained to avoid an unrelated contract rename; each pending/overdue pair is derived from the same aggregate value.

## Target files

Modify only:

- `apps/internal-worker/src/database2/get-daily-report-state.ts`
- `apps/internal-worker/src/database2/get-daily-report-state.test.ts`
- `apps/internal-worker/src/operations/daily-report.test.ts`

Do not modify:

- `apps/internal-worker/src/database2/get-old-stats-albums.ts`
- `apps/internal-worker/src/database2/get-old-tags-albums.ts`
- `apps/internal-worker/src/operations/add-work/lastfm.ts`
- `apps/internal-worker/src/operations/daily-report.ts`, except if required to remove duplicate presentation (not required for this scope)
- `apps/lastfm-worker/`
- `packages/queues/`
- `packages/schemata/`
- database schema or migration files

<Architecture>

### Database aggregation zone

`apps/internal-worker/src/database2/get-daily-report-state.ts` remains the sole owner of report database queries. Preserve the existing Kysely aggregate-query structure and ESM `.js` relative imports.

In the `Album` aggregate query, define the actionable stats renewal predicate as:

```sql
"Album"."hidden" IS NOT TRUE
AND "Album"."nextStatsUpdateAt" <= NOW()
```

Define the actionable tag renewal predicate as:

```sql
"Album"."hidden" IS NOT TRUE
AND "Album"."nextTagsUpdateAt" <= NOW()
```

Use these predicates for both members of each metric pair:

- `current.pendingStats` and `current.overdueStats` use the stats predicate.
- `current.pendingTags` and `current.overdueTags` use the tags predicate.

The aggregate must not count hidden albums in these four values. A `NULL` hidden value is eligible because `IS NOT TRUE` matches the existing scheduler selectors. A `NULL` renewal timestamp is not due because `NULL <= NOW()` is not true.

Keep the hidden registration activity operation unchanged:

```sql
registeredAt >= start
AND registeredAt < end
AND hidden = true
```

Return it as `activity.hiddenAlbumsRegistered`. This is an activity metric and is intentionally not subject to actionable renewal filtering.

Do not change the `Tag`, `TagListItem`, iTunes, top-album, or queue-backlog aggregation operations.

### Report presentation zone

`apps/internal-worker/src/operations/daily-report.ts` remains the owner of Telegram formatting and enqueueing. Existing report labels may remain unchanged. The corrected state values must render without additional filtering or recomputation in the formatter.

### Queue/orchestration zone

`add-work` and Last.fm queue ownership remain unchanged. External provider work continues through `lastfmQueue` and `apps/lastfm-worker/`. No direct provider request, new queue, rate limiter, retry policy, or schema is introduced.

### Package boundaries

No new reusable package code is required. Database coordination remains in `apps/internal-worker/`; shared queue and schema packages are not changed.

</Architecture>

<DataFlow>

1. `daily-report` calls `getDailyReportState(kysely, { start, end })`.
2. The `Album` aggregate query evaluates visible/actionable stats and tag renewal rows using the predicates above.
3. The query produces one stats count and one tag count for the actionable population.
4. The returned state assigns the stats count to both `current.pendingStats` and `current.overdueStats`.
5. The returned state assigns the tag count to both `current.pendingTags` and `current.overdueTags`.
6. The registration window independently counts currently hidden albums registered in `[start, end)` and assigns the result to `activity.hiddenAlbumsRegistered`.
7. All other current and activity aggregates retain their existing contracts.
8. `formatDailyReport()` consumes the returned state and formats the existing Telegram report.
9. `daily-report` enqueues exactly one deterministic Telegram post through `telegramQueue`; no queue or database mutation is added by this change.

The Last.fm scheduler remains the separate source of work mutations:

- `get-old-stats-albums.ts` reserves selected rows by setting `nextStatsUpdateAt = NOW() + interval '24 hours'`.
- `get-old-tags-albums.ts` reserves selected rows by setting `nextTagsUpdateAt = NOW() + interval '24 hours'`.
- Those selectors already use `hidden IS NOT TRUE` and `next*UpdateAt <= NOW()`.

This specification aligns report state with those existing scheduler transitions; it does not alter reservation, enqueue, deduplication, worker success, or retry behavior.

</DataFlow>

<FailureModes>

- Database aggregate failure: propagate the original error; do not enqueue the Telegram report.
- Telegram enqueue failure: propagate the original error so the operation can be retried by its existing queue boundary.
- Invalid daily-report payload: existing validation must fail before database access.
- Hidden value `true`: exclude from actionable stats/tag counts.
- Hidden value `false` or `NULL`: include if the corresponding renewal timestamp is due.
- Renewal timestamp `NULL`: exclude from actionable due counts; do not coerce it to a date.
- Renewal timestamp exactly equal to `NOW()`: include using `<=`, matching the scheduler.
- Hidden album registered during the report window: include in `hiddenAlbumsRegistered`, regardless of renewal fields.
- Concurrent hidden-state or timestamp changes: accept normal point-in-time differences between report aggregation and later scheduling; no cross-operation transaction is introduced.
- BullMQ deduplication or queue backlog: outside this change; report renewal counts are database-derived and must not be replaced with queue counts.
- Numeric aggregate values: continue converting database count results with `Number(...)`; do not weaken types or use unchecked assertions.

</FailureModes>

<TestPlan>

### `apps/internal-worker/src/database2/get-daily-report-state.test.ts`

Use the existing `createKyselyMock()` boundary. Extend aggregate-result fixtures and assertions to verify:

- the returned `pendingStats` and `overdueStats` are equal;
- the returned `pendingTags` and `overdueTags` are equal;
- hidden registration activity remains returned independently;
- existing current/activity aggregates remain unchanged;
- database aggregate failures propagate unchanged.

Where the query mock exposes compiled SQL or builder predicates, assert the Album aggregate contains:

- `hidden IS NOT TRUE`;
- `nextStatsUpdateAt <= NOW()` for stats;
- `nextTagsUpdateAt <= NOW()` for tags.

If the current mock does not expose SQL predicates, add behavior-focused aggregate fixtures and retain the implementation-level predicate review without inventing a new database test harness.

### `apps/internal-worker/src/operations/daily-report.test.ts`

Keep the existing mocked queue boundary and `getDailyReportState` mock. Add assertions that:

- the report renders the corrected stats/tag values;
- pending and overdue values render consistently;
- `Серед них прихованих` remains rendered for registration activity;
- invalid payloads fail before database access;
- database failures propagate;
- Telegram enqueue failures propagate;
- exactly one deterministic Telegram post is enqueued on success.

### Existing scheduler regression coverage

Run, but do not weaken, `apps/internal-worker/src/operations/add-work/lastfm.test.ts`. Its existing assertions must continue to verify that stats, tags, and tag-scrape work are routed to the expected queue/job names. No scheduler behavior test should be changed unless implementation unexpectedly changes an existing contract.

### Verification commands

From repository root, run:

```text
pnpm lint --fix
pnpm test --run
pnpm build
```

Report the result of every command. Any source or generated-file change caused by `pnpm lint --fix` or build output must be reviewed and kept out of the focused change unless explicitly required.

</TestPlan>

## Compatibility impact

The internal `DailyReportState` field names remain unchanged. The values become actionable counts matching Last.fm scheduling eligibility. Hidden registration activity remains unchanged. Queue payloads, database schemas, provider contracts, retry semantics, and idempotency behavior are unchanged.
