# Daily Report for You Must Hear

**Status:** implementation-ready

## Goal

Add a separate scheduled `daily-report` operation to `apps/internal-worker/`, alongside the existing scheduled `add-work` operation. At 06:00 UTC, it aggregates current application state and observable activity from the preceding rolling 24-hour window, then enqueues one Ukrainian Telegram report.

The report is aggregate-only. It must not enumerate individual changed lists, report cover/link ratios, or count tags missing descriptions. No durable activity history is introduced.

## Scope and boundaries

`apps/internal-worker/` owns scheduling, database aggregation, report formatting, and enqueueing. It must not call Telegram directly or make provider requests.

`apps/telegram-worker/` remains the owner of the Telegram API request through its existing `post` operation.

`packages/queues/` is reused for queue access, enqueueing, worker behavior, and idempotency. `packages/schemata/` is reused for `TelegramPost`; no new cross-worker report payload is required.

The report window is `[execution time - 24 hours, execution time)`. Queue counts are an instantaneous snapshot during report generation, not historical queue statistics.

## <Architecture>

### Exact files and operations

1. **`apps/internal-worker/src/index.ts`**
   - Register a repeatable `daily-report` job on `internalQueue`.
   - Schedule it for 06:00 UTC daily.
   - Keep the existing hourly `add-work` repeatable job unchanged.
   - Use a stable job identity so restarts do not create duplicate schedules.

2. **`apps/internal-worker/src/operations/index.ts`**
   - Register the `daily-report` operation.
   - Validate its empty-object payload using the existing operation-registration pattern.

3. **`apps/internal-worker/src/operations/daily-report.ts`**
   - Derive the report end time from execution time and the start time as 24 hours earlier.
   - Read the complete aggregate through the dedicated database function.
   - Format one Ukrainian Telegram message.
   - Enqueue exactly one `telegramQueue` `post` job using the existing `TelegramPost` contract.
   - Use a deterministic report-period identity so retries do not enqueue duplicates.

4. **`apps/internal-worker/src/database2/get-daily-report-state.ts`**
   - Own all Kysely queries needed by the report.
   - Use generated `DB` types and existing database access.
   - Return typed aggregate values, not raw query results.
   - Keep the queries read-only.

5. **`apps/internal-worker/src/database2/get-daily-report-state.test.ts`**
   - Test aggregate query behavior at the existing Kysely mock boundary.

6. **`apps/internal-worker/src/operations/daily-report.test.ts`**
   - Test time-window derivation, formatting, enqueueing, idempotency, and failure propagation.

### Report sections

The Ukrainian message contains only aggregate sections:

- **Поточний стан**: total albums, total tags, total generated lists, current queue backlog, pending statistics/tags/iTunes work, and overdue refresh work where existing queries establish those values.
- **За останні 24 години**: albums registered, statistics updates, tag updates, iTunes checks, tag album scrapes, changed lists, unchanged list checks, and other outcomes only where existing database state supports the aggregate.
- **Обмеження**: current queue snapshot and current system-deferral information where available.

It must not include individual tag, album, or list names; list diffs; cover/link ratios; or missing-description counts.

### Zones and patterns

- Database values are handled through typed Kysely results and explicit null handling.
- BullMQ `job.data` is validated before operation logic.
- Telegram payloads use `TelegramPost`/`telegramPostSchema`.
- Relative imports use `.js` extensions.
- No unchecked production assertions, `any`, non-null assertions, or suppression comments are introduced.

## <DataFlow>

1. `internal-worker` registers the daily repeatable `daily-report` job at 06:00 UTC.
2. BullMQ delivers the empty payload to `internal-worker`.
3. The operation boundary validates the payload.
4. The operation captures an execution timestamp and derives a 24-hour window ending at that timestamp.
5. `get-daily-report-state.ts` reads current aggregates and timestamp-based activity from `Album` and `Tag`, using:
   - `Album.registeredAt`, `statsUpdatedAt`, `tagsUpdatedAt`, `itunesCheckedAt`, `nextStatsUpdateAt`, `nextTagsUpdateAt`;
   - `Tag.registeredAt`, `albumsScrapedAt`, `listCheckedAt`, and `listUpdatedAt`.
6. It reads current queue counts from the existing queues.
7. The operation formats the result in Ukrainian.
8. It enqueues one `telegramQueue` `post` job with the formatted text and no image.
9. `telegram-worker` validates `TelegramPost` and sends the message through Telegram.

Timestamp-based activity is an approximation of observable latest state. Multiple updates to one row may appear as one update. No event ledger, job-history table, or historical queue snapshot is added.

`Tag.listUpdatedAt` supplies the aggregate changed-list count. Individual list changes are never loaded for presentation. List-removal history is skipped unless an existing durable field supports it without a significant rewrite; the report must not fabricate a removal count.

## <FailureModes>

### Invalid operation payload

Validate the empty-object payload before report logic. Deterministically invalid data must fail without database aggregation or Telegram enqueueing and use existing non-retryable validation behavior.

### Database or queue snapshot failure

Any failed aggregate or required queue-count query fails the complete report. No partial Telegram report is sent. Existing internal queue retry behavior handles transient failures.

### Telegram enqueue or delivery failure

Failure to enqueue the Telegram post propagates so the scheduled job can retry. Telegram API failures remain governed by `telegram-worker`; this change does not alter provider retry semantics.

### Duplicate scheduled execution

The report post identity is deterministic for the reporting period. Restart or retry must not create duplicate Telegram messages for that period.

### Empty activity window

Zero-valued aggregates render as valid Ukrainian text and the report is still sent.

### Missing historical evidence

The report must not claim to show all jobs, failures, retries, or repeated updates. It reports timestamp-derived activity from current database state. Failed operations are omitted unless an existing persisted value proves them.

### Message size

The aggregate-only report must stay within Telegram’s existing message limit. It must not append unbounded itemized details as a fallback.

## <TestPlan>

### `apps/internal-worker/src/database2/get-daily-report-state.test.ts`

Use the existing Kysely mock boundary. Assert that:

- current-state aggregates are calculated correctly;
- the rolling window uses `[start, end)` boundaries;
- null timestamps do not count as activity;
- `Tag.listUpdatedAt` produces an aggregate changed-list count without list identities;
- no cover/link or missing-description metrics are selected;
- empty tables return zero values;
- query failure propagates.

### `apps/internal-worker/src/operations/daily-report.test.ts`

Mock the database aggregation function and `enqueue` at the queue boundary. Assert that:

- the operation derives a 24-hour rolling window;
- the message is Ukrainian and aggregate-only;
- individual albums, tags, and lists are never rendered;
- excluded metrics are absent;
- the Telegram payload satisfies `TelegramPost`;
- the post uses deterministic period identity;
- exactly one Telegram job is enqueued on success;
- database and enqueue failures propagate;
- zero activity produces a valid report.

### Scheduling and dispatch tests

At the existing internal operation/queue test boundaries, assert that:

- `daily-report` resolves to the new operation;
- its empty payload is accepted and invalid payloads are rejected before execution;
- the repeatable schedule is registered at 06:00 UTC;
- the existing hourly `add-work` schedule remains unchanged;
- the daily schedule has stable identity across restarts.

### Verification

Run from the repository root:

```text
pnpm lint --fix
pnpm test --run
pnpm build
```

## Compatibility impact

This adds one internal repeatable job and one Telegram message per day. It does not change provider contracts, database schemas, queue concurrency, retry policy, or the `add-work` schedule.

The report is intentionally limited by existing persistence. It does not provide durable historical failure, retry, duplicate-update, or list-removal accounting.

## Deferred decisions

No durable activity history is planned. A future event ledger would be a separate change requiring persistence semantics, idempotency rules, and migration work.
