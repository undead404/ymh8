# Daily Report for You Must Hear

**Status:** implementation-ready

## Goal

Extend the scheduled daily Telegram report with clearer list coverage, registration quality, representative newly registered albums, and Ukrainian number formatting. The report uses the existing database schema and remains a rolling 24-hour report with an instantaneous queue snapshot.

The report must show:

- total albums and tags;
- tags with generated lists;
- distinct albums belonging to at least one valid tag list;
- pending and overdue statistics/tag work, but not the global iTunes-less album backlog;
- albums registered during the preceding 24 hours and how many are currently hidden;
- up to three newly registered albums with the highest current non-null `playcount`;
- iTunes checks completed during the window and the current number of those checked albums with an iTunes preview link;
- all numeric values formatted with the Ukrainian locale.

The iTunes preview metric is explicitly current-state evidence. It must not be presented as an exact historical found-result count because `AlbumLink` has no timestamp.

## Scope and boundaries

`apps/internal-worker/` owns scheduling, database aggregation, report formatting, and Telegram enqueueing. It must not call iTunes or Telegram directly.

`apps/itunes-worker/` remains the owner of iTunes provider requests and existing `AlbumLink` writes. No iTunes-worker change, migration, or new persistence is required for this report change.

`apps/telegram-worker/` remains the owner of the Telegram API request through its existing `post` operation.

`packages/queues/` is reused unchanged for queue access, enqueueing, worker behavior, and idempotency. `packages/schemata/` is reused unchanged for `TelegramPost`; no new cross-worker payload is required.

The report window is `[execution time - 24 hours, execution time)`. Queue counts are an instantaneous snapshot during report generation, not historical queue statistics.

## Exact files and operations

### Files to change

1. **`apps/internal-worker/src/database2/get-daily-report-state.ts`**
   - Extend the typed `DailyReportState` contract.
   - Add list coverage, hidden registration, top registered album, and qualified iTunes preview aggregates.
   - Remove `pendingItunes` from the report state because global iTunes eligibility is not a user-facing workflow metric.
   - Keep all queries read-only and use generated `DB` types.

2. **`apps/internal-worker/src/database2/get-daily-report-state.test.ts`**
   - Extend aggregate query tests for every new field and boundary.

3. **`apps/internal-worker/src/operations/daily-report.ts`**
   - Add report lines for the new state fields.
   - Add one Ukrainian locale number formatter for all displayed numeric values.
   - Render up to three top registered albums.
   - Use qualified wording for the current iTunes preview metric.
   - Preserve payload validation, queue snapshot behavior, deterministic period identity, and Telegram enqueueing.

4. **`apps/internal-worker/src/operations/daily-report.test.ts`**
   - Test formatting, new sections, qualified iTunes wording, and unchanged enqueue behavior.

5. **`docs/specs/daily-report.md`**
   - This specification.

### Files not to change

- `apps/telegram-worker/`
- `apps/itunes-worker/`
- `packages/queues/`
- `packages/schemata/`
- database schema or migration files
- repeatable-job scheduling files, unless existing report registration is already present and requires no change for these metrics

## State contract

`DailyReportState.current` must contain:

- `albums: number`
- `tags: number`
- `tagsWithLists: number`
- `albumsInAtLeastOneList: number`
- `pendingStats: number`
- `pendingTags: number`
- `overdueStats: number`
- `overdueTags: number`

`DailyReportState.activity` must contain:

- `albumsRegistered: number`
- `hiddenAlbumsRegistered: number`
- `statsUpdated: number`
- `tagsUpdated: number`
- `itunesChecked: number`
- `albumsWithItunesPreview: number`
- `tagAlbumsScraped: number`
- `listsChanged: number`
- `listsUnchanged: number`
- `topRegisteredAlbums: Array<{ artist: string; name: string; playcount: number }>`

`topRegisteredAlbums` contains at most three entries and never contains a null `playcount`.

## <Architecture>

### Database aggregation

`get-daily-report-state.ts` remains the only owner of report database queries. Keep the existing two aggregate query pattern unless the query builder requires a separate query for the top-three result.

Current album aggregates remain based on `Album`. Current tag aggregates remain based on `Tag`.

Add these exact operations:

1. **Tags with lists**
   - Count `Tag` rows where `listUpdatedAt IS NOT NULL`.
   - Return as `current.tagsWithLists`.
   - Do not label this value simply `Списки`, because it counts tags, not list entities.

2. **Albums in at least one list**
   - Join `TagListItem` to `Album` using:
     - `TagListItem.albumArtist = Album.artist`
     - `TagListItem.albumName = Album.name`
   - Count distinct album identity `(Album.artist, Album.name)`.
   - Orphaned `TagListItem` rows must not count.
   - Return as `current.albumsInAtLeastOneList`.

3. **Hidden registrations**
   - Count `Album` rows where `registeredAt >= start`, `registeredAt < end`, and `hidden = true`.
   - Return as `activity.hiddenAlbumsRegistered`.
   - This is the current hidden state of albums registered in the window, not a historical hidden-state event.

4. **Top registered albums**
   - Select albums where `registeredAt >= start`, `registeredAt < end`, and `playcount IS NOT NULL`.
   - Order by `playcount DESC`, followed by stable `artist ASC` and `name ASC` tie-breakers.
   - Limit to three rows.
   - Return artist, name, and numeric playcount only.
   - Do not expose album rows outside the requested three.

5. **iTunes checks and current preview coverage**
   - Keep `itunesChecked` as the count of `Album` rows whose `itunesCheckedAt` is within `[start, end)`.
   - Count `albumsWithItunesPreview` from those checked albums joined to `AlbumLink` where `AlbumLink.type = 'itunes_preview'`.
   - Match the album using `(albumArtist, albumName)`.
   - Count distinct albums, not link rows.
   - This metric means “albums checked in the window that currently have an iTunes preview link”; it must not be described as “found during the window”.

6. **Removed iTunes backlog**
   - Do not select or render `Album.itunesCheckedAt IS NULL` as a pending user-facing metric.
   - Do not replace it with a list-filtered pending count in this change.

### Report formatting

`daily-report.ts` must use one locale-aware formatter based on `uk-UA` for every number rendered in the Telegram message, including:

- current counts;
- queue totals;
- pending and overdue counts;
- activity counts;
- playcounts;
- percentages.

The formatter must preserve numeric meaning, format zero as `0`, and use Ukrainian decimal formatting for percentages. Album artist/name strings are not passed through the numeric formatter.

The report should use these Ukrainian labels:

- `Теги зі списками: ...`
- `Альбоми хоча б в одному списку: ...`
- `Очікують статистики / тегів: ... / ...`
- `Серед них прихованих: ... (...)` when registrations exist
- `Найпопулярніші зареєстровані:` for the optional top-three block
- `Перевірено в iTunes: ...`
- `Альбомів із iTunes-прев’ю: ...`

Do not use `Знайдено в iTunes` for the current preview-link metric.

### Zones and patterns

- `internal-worker` owns all internal aggregation and orchestration.
- External provider requests remain in provider workers.
- Database values use typed Kysely results and explicit numeric conversion consistent with the existing implementation.
- `job.data` is validated before operation logic.
- Telegram payloads use the existing `TelegramPost` contract.
- Relative imports use `.js` extensions.
- No unchecked production assertions, `any`, non-null assertions, or suppression comments are introduced.
- The top-three album names are the only itemized data added; no list or tag identities are enumerated.

## <DataFlow>

1. The scheduled `daily-report` job delivers the existing empty payload to `internal-worker`.
2. The operation validates the payload before reading the database or queues.
3. The operation captures `end` and derives `start` as exactly 24 hours earlier.
4. `get-daily-report-state.ts` reads current aggregates from `Album`, `Tag`, and `TagListItem`/`Album`.
5. It reads iTunes preview relationships from `AlbumLink` only for albums whose `itunesCheckedAt` falls in the reporting window.
6. It returns typed state, including hidden registrations and the bounded top-three result.
7. The operation reads instantaneous BullMQ counts from the existing queues.
8. The operation formats all numeric values with the Ukrainian locale formatter.
9. The operation omits the hidden-registration percentage when `albumsRegistered` is zero; it renders the hidden count as zero.
10. The operation renders zero to three top registered albums.
11. The operation enqueues exactly one `telegramQueue` `post` job with the existing `TelegramPost` payload.
12. The deterministic report-period identity prevents duplicate posts on retry or restart.
13. `telegram-worker` validates and delivers the message without contract changes.

The report does not claim to provide historical iTunes found/not-found outcomes. Existing `itunesCheckedAt` and current `AlbumLink` state are the only evidence used.

## <FailureModes>

### Invalid operation payload

Validate the empty-object payload before aggregation. Deterministically invalid data must fail without database access or Telegram enqueueing and use existing non-retryable validation behavior.

### Database aggregate failure

Any failed aggregate query fails the complete report. No partial Telegram report is sent. Existing internal queue retry behavior handles transient failures.

### Join and duplicate handling

Orphaned `TagListItem` rows are excluded by the `Album` join. Duplicate list memberships and duplicate preview-link rows must not inflate distinct album counts.

### Null and empty values

- Null `playcount` values are excluded from the top-three query.
- Fewer than three eligible albums produce only the available entries.
- No eligible albums produce no top-three item lines.
- Zero registrations produce a valid report without a misleading percentage.
- Null timestamps do not count as window activity.

### iTunes interpretation

A current preview link may have been created before the reporting window. The report must use qualified wording and must not claim that the link was found during the window.

### Number formatting

All state and activity numeric values must be finite numbers before formatting. The implementation must not render `NaN`, `Infinity`, or raw unformatted values.

### Telegram enqueue or delivery failure

Failure to enqueue propagates so the scheduled job can retry. Telegram API failures remain governed by `telegram-worker`; this change does not alter provider retry semantics.

### Duplicate scheduled execution

The existing deterministic post identity remains unchanged. Retry or restart must not create duplicate Telegram posts for the same reporting period.

### Message size

The report remains bounded: queue names are fixed, and at most three albums are listed. No unbounded itemized fallback is permitted.

## <TestPlan>

### `apps/internal-worker/src/database2/get-daily-report-state.test.ts`

Use the existing Kysely mock boundary. Assert that:

- `tagsWithLists` counts only `Tag.listUpdatedAt IS NOT NULL` rows;
- `albumsInAtLeastOneList` counts distinct joined albums;
- orphaned `TagListItem` rows are excluded;
- hidden registrations use `[start, end)` boundaries;
- top registered albums use the same boundaries;
- null playcounts are excluded;
- top albums are ordered by descending playcount with deterministic tie-breaking and limited to three;
- iTunes checks use `Album.itunesCheckedAt` within `[start, end)`;
- current iTunes preview coverage uses `AlbumLink.type = 'itunes_preview'` and distinct album identity;
- `pendingItunes` is absent from the returned contract;
- null timestamps do not count;
- empty tables and empty top-three results return valid zero/empty values;
- aggregate query failures propagate.

### `apps/internal-worker/src/operations/daily-report.test.ts`

Mock the database aggregation function and `enqueue` at the queue boundary. Assert that:

- the operation derives the rolling 24-hour window;
- all displayed large numbers use Ukrainian locale formatting;
- percentages use Ukrainian decimal formatting;
- the report uses explicit list labels;
- the global iTunes-less backlog line is absent;
- iTunes preview coverage uses qualified current-state wording;
- hidden registration count and percentage render correctly;
- zero registrations do not render a misleading percentage;
- zero to three top albums render correctly;
- album names and playcounts are rendered for the top-three block;
- exactly one Telegram job is enqueued on success;
- the Telegram payload satisfies `TelegramPost`;
- deterministic period identity remains unchanged;
- database and enqueue failures propagate;
- invalid payloads are rejected before aggregation.

### Existing queue and scheduling tests

At existing operation and queue boundaries, verify that:

- the existing daily report operation remains registered;
- the empty payload remains accepted;
- queue backlog collection remains unchanged;
- the existing schedule and `add-work` schedule remain unchanged.

### Verification

Run from the repository root:

```text
pnpm lint --fix
pnpm test --run
pnpm build
```

## Compatibility impact

This changes only the internal report state and Telegram message content. It does not change database schemas, provider contracts, queue payloads, queue concurrency, retry policy, or scheduled-job identity.

The report adds a bounded top-three album block and removes the global iTunes-pending metric. Consumers of `DailyReportState` must be updated together with the report query and tests; no external package contract changes.

## Deferred decisions

Exact historical iTunes found/not-found reporting remains deferred. It would require a separate persistence design for check outcomes, retry idempotency, provider failures, and migrations. This specification intentionally uses the existing current-state `AlbumLink` evidence instead.
