# OpenAI LLM Queue Migration

**Status:** implementation-ready

## Goal

Replace the Claude integration used by `LlmQueue` with the OpenAI Responses API. After deployment, every job processed by `LlmQueue` must use OpenAI, including jobs already waiting in Redis. The OpenAI model is hardcoded exactly as `gpt-5.6-luna`.

The migration must preserve the existing tag-description prompt, database transaction and persistence flow, Telegram notification flow, queue names, payloads, retry policy, timeout behavior, concurrency/rate limiting, and idempotency behavior. Existing persisted descriptions must not be regenerated.

## Boundaries

- `apps/llm-worker/` owns the OpenAI provider request and response handling.
- `apps/internal-worker/` continues to select descriptionless tags and enqueue the existing LLM operation; it must not call OpenAI.
- `packages/queues/` continues to own queue construction, enqueueing, deduplication, retry defaults, worker limiting, and queue shutdown behavior.
- `packages/schemata/` remains the owner of shared cross-worker payload contracts; no LLM queue payload change is required.
- Only `OPENAI_API_KEY` may be read from the environment for the provider. All other OpenAI configuration, including the model, must be in source code.
- This is a specification-only change now. Do not modify package manifests, lockfiles, generated output, environment files, or source code while producing this document.

## Exact Target Paths

Implementation targets are limited to these paths:

1. `apps/llm-worker/src/environment.ts`
2. `apps/llm-worker/src/llm.ts`
3. `apps/llm-worker/src/operations/generate-tag-description.ts`
4. `apps/llm-worker/src/operations/generate-tag-description.test.ts`
5. `apps/llm-worker/src/utils/extract-text-content.ts`
6. `apps/llm-worker/src/utils/extract-text-content.test.ts` (create if the existing test location does not exist)
7. `apps/llm-worker/package.json` only during a later implementation, if the OpenAI SDK dependency is not already available
8. `pnpm-lock.yaml` only during a later implementation if dependency resolution requires it

The manifest and lockfile entries are listed for implementation planning only and must not be edited as part of this specification-only task. Do not modify `packages/queues/`, `apps/internal-worker/`, queue schemas, database schema, or Telegram worker code.

## Operations

1. Replace the `ANTHROPIC_API_KEY` environment schema entry with exactly `OPENAI_API_KEY`. Keep existing database environment entries unchanged. Fail startup through the existing validation path when the key is absent or empty.
2. Replace the Anthropic client in `apps/llm-worker/src/llm.ts` with the OpenAI SDK client, initialized only with `environment.OPENAI_API_KEY`.
3. Call the OpenAI Responses API from the existing `tag:description:generate` operation. Use `model: 'gpt-5.6-luna'` exactly. Do not select the model from environment variables, job data, database values, or command-line arguments.
4. Map the existing `systemPrompt` and existing user content exactly into the Responses API request. Preserve the `TARGET_GENRE`, `NEIGHBORING GENRES (Context)`, and `CANDIDATE ARTISTS (Raw Data)` labels and values, including their ordering and newline structure.
5. Extract only the final text response required by the existing description flow. Validate or narrow the SDK response at the provider boundary; do not use unchecked casts, `any`, non-null assertions, or suppression comments. Empty or structurally unusable provider output must fail rather than write an invented description.
6. Preserve the current transaction flow: read top artists and related tags, log top artists, request the provider while inside the transaction, save the description, and enqueue the existing Telegram `post` payload with `escapeForTelegram`.
7. Before making an OpenAI request, read the current tag description within the existing database transaction. If a description is already persisted, return without calling OpenAI, without overwriting it, and without sending a duplicate Telegram notification. This prevents a queued job from regenerating a description that was persisted after enqueueing.
8. Keep the existing `bareTagSchema` payload and operation name `tag:description:generate`. Continue validating the BullMQ payload before business logic through the existing processor/schema path; do not introduce a new payload version or compatibility union.
9. Preserve the existing source-module boundaries and ESM TypeScript conventions. All relative imports must use `.js` extensions.
10. If the OpenAI SDK is not already available, add only the required SDK dependency in a later implementation; do not add configuration packages or alternate provider clients.

## Routing

`packages/queues/src/constants.ts` continues to define the queue name exactly as `LlmQueue`. `apps/internal-worker/src/operations/add-work/llm.ts` continues to enqueue the same `tag:description:generate` operation with the tag name as identity, the existing bare-tag payload, and priority `100`.

`apps/llm-worker/src/operations/index.ts` continues to route `tag:description:generate` to `generateTagDescription`. No routing by provider, model, deployment version, or job age is permitted. The `llm-worker` process continues to consume the existing `LlmQueue`; when the new deployment starts, waiting and delayed jobs are handled by the OpenAI implementation without migration, draining, or re-enqueueing into another queue.

## Preserved Queue Behavior

Do not change the following values or mechanisms:

- Queue name: `LlmQueue`.
- Operation name and payload shape: `tag:description:generate` with the existing bare-tag payload.
- Job identity and deduplication generated from the existing operation name and tag identity.
- Queue defaults: five attempts, exponential backoff starting at 60 seconds, `removeOnComplete: 100`, and `removeOnFail: 500`.
- Worker limiter: one job per 60,000 milliseconds.
- Worker lock duration: 60,000 milliseconds.
- Existing stalled-job, shutdown, retry, and error-handler behavior.
- Existing 60,000-millisecond operation processing timeout configured in `process-job.ts`.

The provider replacement must not add a second queue, bypass BullMQ, increase concurrency, alter retry classification, or change idempotency keys.

<Architecture>

The owning provider boundary remains `apps/llm-worker/src/llm.ts`. It exports one OpenAI client initialized from the validated `OPENAI_API_KEY`; it contains no environment-derived model or request tuning. The operation remains in `generate-tag-description.ts` and remains responsible for local database reads, provider invocation, persistence, and Telegram enqueueing.

The Responses API request must use the hardcoded model `gpt-5.6-luna`, the existing `systemPrompt`, and the existing user prompt text. Use the SDK's typed response text facility where available, or a small local parser that explicitly validates the returned response shape. Provider output is untrusted until validated as non-empty text.

The existing database access helpers should be reused where possible. Add the smallest query/helper necessary to determine whether the target tag already has a persisted description. Do not introduce a migration or alter the database schema. The guard must execute before provider work and before any description write or Telegram enqueue.

No existing description is regenerated as part of deployment. There is no bulk backfill, queue replay, or provider-selection flag. Jobs already waiting are ordinary existing jobs and route directly to OpenAI when processed; if their target now has a persisted description, they are skipped by the guard.

Production code must follow repository constraints: no unchecked assertions, non-null assertions, explicit `any`, or TypeScript suppression comments across the environment, SDK, database, BullMQ, or provider boundaries. Preserve `.js` extensions on relative imports.

</Architecture>

<DataFlow>

1. `internal-worker` finds tags without descriptions using the existing database query.
2. It enqueues the unchanged `tag:description:generate` payload into `LlmQueue` with the unchanged identity, deduplication, priority, retry, and queue-limit behavior.
3. BullMQ delivers either a newly enqueued job or a job that was already waiting before deployment to the existing `llm-worker` process.
4. The shared operation processor validates `job.data` with `bareTagSchema` before invoking the operation.
5. `generateTagDescription` checks the blacklist as it does today, then starts the existing database transaction.
6. The operation reads the current persisted description. A non-null existing description ends the operation without an OpenAI request, write, or Telegram post.
7. For a still-descriptionless tag, the operation reads the existing top artists and related tags, logs the artists, and constructs the unchanged user prompt.
8. The operation calls the OpenAI Responses API using only `OPENAI_API_KEY` for environment configuration and exactly `gpt-5.6-luna` for the model.
9. The provider response is validated and converted to the description text. The existing system prompt remains unchanged and the response must remain the sole final description text.
10. The operation saves the description through the existing database helper in the same transaction.
11. The operation enqueues exactly the existing Telegram `post` operation and `TelegramPost` payload for a newly generated description.
12. Queue completion, retry, shutdown, and deduplication remain governed by the existing queue implementation.

</DataFlow>

<FailureModes>

### Missing API key

Startup fails through the existing environment validation when `OPENAI_API_KEY` is missing or empty. No provider request is attempted. `ANTHROPIC_API_KEY` is not accepted or required.

### Invalid queue payload

The existing schema boundary rejects malformed or stale payloads before database or provider side effects, using the repository's existing non-retryable validation behavior. No payload compatibility union is added.

### Existing description

A queued job whose tag now has a persisted description completes without regeneration, overwrite, provider usage, or Telegram notification. This is an expected idempotent no-op, not a provider failure.

### OpenAI response shape or empty output

Malformed, missing, or empty response text fails at the provider boundary. It must not be persisted or sent to Telegram. The error remains eligible for the existing queue retry behavior unless the existing operation explicitly classifies it as deterministic invalid input.

### Network, rate-limit, timeout, or service failure

OpenAI transport failures, rate limits, service errors, and operation timeouts retain the existing five-attempt, exponential 60-second backoff and 60-second worker/operation timing behavior. Do not add a separate retry loop or classify transient provider failures as payload validation failures.

### Transaction or Telegram failure

Existing transaction atomicity and propagation remain unchanged. A database failure does not send a Telegram post. A Telegram enqueue failure propagates through the existing queue behavior and must not result in a second description write outside the transaction.

### Deployment with waiting jobs

The new worker must not inspect job creation time to select Claude or OpenAI. All jobs processed after deployment use OpenAI. No waiting-job migration or manual replay is required.

</FailureModes>

<TestPlan>

### Environment and client tests

- Assert `OPENAI_API_KEY` is required.
- Assert `ANTHROPIC_API_KEY` is neither read nor required.
- Assert the client is initialized with the validated OpenAI key and no environment model/configuration.

### Operation tests

Update `apps/llm-worker/src/operations/generate-tag-description.test.ts` to cover:

- blacklisted tags still short-circuit before database and provider work;
- valid descriptionless input calls the Responses API with exactly `gpt-5.6-luna`;
- the system prompt and user prompt preserve the existing content and labels;
- provider text is saved through the existing database helper;
- exactly one existing Telegram payload is enqueued on successful generation;
- an already persisted description skips the provider, save, and Telegram enqueue;
- a queued-job scenario that becomes persisted before execution does not regenerate the description;
- malformed, missing, and empty provider response text fails before persistence and notification;
- transient provider errors propagate without a new retry loop;
- invalid queue payloads are rejected before database access or provider calls;
- existing deduplication identity and operation name remain unchanged.

Tests may use casts only to assemble mocks and fixtures. They must pass raw invalid provider or queue values through the real validation path rather than casting them into trusted types.

### Provider response extraction tests

Add or update `apps/llm-worker/src/utils/extract-text-content.test.ts` for valid Responses API text, empty output, missing output, unexpected content, and multiple output items according to the chosen typed SDK response representation. Assert that uncertain or malformed output is rejected rather than coerced.

### Queue and integration boundary checks

Use existing queue tests or add focused tests without changing production queue settings. Verify that queue names, payloads, attempts, backoff, timeout, concurrency/rate limits, and generated job IDs are unchanged. Verify that jobs created before the deployment boundary are processed by the OpenAI client when consumed by the new worker.

### Required verification

Run from the repository root after implementation:

```text
pnpm lint --fix
pnpm test --run
pnpm build
```

The implementation is incomplete if any command fails or cannot be run.

</TestPlan>

## Alternatives and Tradeoffs

### Keep Claude and select OpenAI per job

Rejected. Provider selection by job age, payload, or deployment version would violate the requirement that every job processed after deployment uses OpenAI and would require a queue payload or compatibility contract change.

### Create a new OpenAI queue

Rejected. A second queue would require migration and would change queue names, routing, backlog semantics, idempotency, and operational limits. Reusing `LlmQueue` ensures waiting jobs are processed by the new worker without re-enqueueing.

### Regenerate all existing descriptions

Rejected. It would overwrite persisted content, increase provider load, create duplicate Telegram notifications, and violate the requirement to preserve existing descriptions. The implementation only generates for currently descriptionless tags and guards queued races.

### Put the model or provider in environment configuration

Rejected. It would make deployment behavior mutable and could cause jobs in the same queue to use different models. The model is hardcoded exactly as `gpt-5.6-luna`; only the API key is environment configuration.

### Add a custom retry or rate limiter for OpenAI

Rejected. BullMQ and the existing worker limiter already define the protection boundary. A second retry or limiter could multiply delays and change established retry/timeout/concurrency behavior.

## Acceptance Criteria

- `LlmQueue` remains named exactly `LlmQueue` and continues to receive the existing operation and payload.
- Every job consumed after deployment, including jobs already waiting, invokes OpenAI or performs the explicit existing-description no-op; no job invokes Claude.
- The model sent to the Responses API is hardcoded exactly `gpt-5.6-luna`.
- The only provider environment variable is `OPENAI_API_KEY`.
- The existing system prompt, user prompt, database save flow, and Telegram post flow are preserved.
- Persisted descriptions are never bulk-regenerated or overwritten by this migration; a queued job also skips if its description has since been persisted.
- Queue retry, timeout, concurrency/rate limiting, queue names, payloads, and idempotency behavior are unchanged.
- Responses are validated before persistence and malformed or empty output cannot produce a description or Telegram post.
- Tests cover success, existing-description no-op, invalid boundaries, provider failures, and waiting-job routing.
- The implementation uses ESM TypeScript and `.js` relative imports and introduces no prohibited production assertions or unsafe boundary bypasses.
- `pnpm lint --fix`, `pnpm test --run`, and `pnpm build` pass from the repository root.

## Compatibility Impact

This is a provider implementation change behind the existing `LlmQueue` contract. Queue names, operation names, payloads, generated identities, retries, timeout, concurrency, rate limiting, and downstream Telegram/database contracts remain compatible. Jobs already persisted in Redis remain valid and are processed by OpenAI without migration.

The provider credential contract changes from `ANTHROPIC_API_KEY` to `OPENAI_API_KEY`, so deployment environments must provide the new key before starting `llm-worker`. Existing database descriptions are retained and are not regenerated. Newly generated text may differ because it is produced by OpenAI, but the prompt and output persistence/notification flow remain unchanged.
