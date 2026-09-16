# Type Safety and Queue Validation

**Status:** implementation-ready

## Goal

Prevent unchecked type lies in production code while allowing type assertions in unit-test setup. External responses and BullMQ payloads must be treated as untrusted runtime data and promoted to domain values only through Valibot validation or explicit control-flow narrowing.

## Scope and boundaries

Production enforcement applies to:

- `apps/*/src/**/*.ts`
- `packages/*/src/**/*.ts`

Unit-test exceptions apply to:

- `apps/*/src/**/*.test.ts`
- `packages/*/src/**/*.test.ts`
- existing test utility directories

Integration and end-to-end test policy is intentionally postponed until those tests are introduced.

Provider integrations remain in their owning workers. Internal orchestration and queue enqueueing remain in `apps/internal-worker/`. Shared schemas belong in `packages/schemata/`; shared BullMQ behavior belongs in `packages/queues/`. Existing ESM TypeScript conventions and `.js` relative imports remain unchanged.

## <Architecture>

### Exact files and operations

1. **`eslint.config.mjs`**
   - Add production-only prohibitions for unchecked type assertions, non-null assertions, explicit/implicit `any`, and TypeScript suppression comments.
   - Do not apply those prohibitions to unit-test files.
   - Permit a production exception only through a surgical, local `eslint-disable` directive on an unavoidable adapter expression. The directive must include a reason.
   - Do not permit broad file-level or directory-level disables.

2. **`AGENTS.md`**
   - State that production casts are forbidden and that unit-test casts are permitted only as test setup.
   - Require a boundary audit for every external-provider or BullMQ change.
   - Require tests proving malformed boundary data is rejected.

3. **`packages/schemata/src/index.ts`**
   - Own reusable Valibot schemas for cross-worker payloads and domain-neutral boundary contracts.
   - Export inferred types from schemas rather than maintaining duplicate payload interfaces.
   - Add schemas for queue payloads that are shared by more than one application.

4. **`packages/queues/src/index.ts` and `packages/queues/src/process.ts`**
   - Keep queue ownership, enqueueing, dispatch, retry configuration, and worker behavior in `packages/queues/`.
   - Associate each operation name with its Valibot payload schema at the processing boundary.
   - Validate `job.data` before invoking operation logic.
   - Do not rely on BullMQ generic types as runtime validation.
   - Preserve existing queue concurrency, rate limits, timeout behavior, idempotency, and retry settings unless explicitly changed.

5. **Worker process and operation files**
   - `apps/*/src/process-job.ts` registers operation handlers and their payload schemas through the shared queue boundary.
   - `apps/*/src/operations/**/*.ts` receives already-validated operation input, or performs local Valibot validation when the operation is not dispatched through the shared registry.
   - `apps/discogs-worker/src/`, `apps/lastfm-worker/src/`, `apps/itunes-worker/src/`, and `apps/llm-worker/src/` validate provider responses at the provider integration boundary.
   - `apps/telegram-worker/src/` validates Telegram operation payloads before use.
   - `apps/internal-worker/src/` validates internal and enqueue-facing payloads but performs no external provider requests.

### Zones and patterns

- **Untrusted zone:** HTTP responses, `response.json()`, environment variables, database JSON, request input, Redis/BullMQ data, caught errors, and third-party library values.
- **Validation zone:** Valibot schemas in `packages/schemata/` or an owning provider worker when the schema is provider-specific.
- **Trusted zone:** code after successful `v.parse`/equivalent Valibot validation or explicit narrowing such as `instanceof Error`.
- **Test zone:** unit tests may use any casts to assemble mocks and fixtures, but validation tests must pass raw malformed values through the real validation path.

Production code must not use `as`, `as any`, non-null assertions, `@ts-ignore`, or `@ts-expect-error` to cross from the untrusted zone into the trusted zone.

### Adapter exception pattern

If a third-party adapter cannot be expressed safely without an assertion, isolate the assertion in the smallest possible adapter expression and add a surgical eslint-disable directive with a reason. The adapter must not expose an unchecked value to the rest of the application.

## <DataFlow>

### BullMQ input flow

1. A producer enqueues a payload through the existing queue utilities.
2. The payload is serialized by BullMQ/Redis and is therefore considered untrusted on receipt.
3. The worker resolves the operation name.
4. The operation schema validates `job.data`.
5. On success, the parsed value is passed to operation logic.
6. On validation failure, operation logic is not called.
7. The validation failure is converted to BullMQ’s non-retryable error mechanism supported by the installed BullMQ `~5.65.1` version.
8. The job is marked failed without consuming further retry attempts.

No backward-compatible union schemas are required for existing persisted jobs. A schema change may permanently reject old payloads.

### External provider flow

1. The owning worker performs the provider request.
2. The raw response body remains untrusted.
3. A Valibot schema validates and transforms the response, preserving missing or conflicting values rather than inventing certainty.
4. Only the parsed result crosses into provider/domain logic.
5. Malformed responses fail at the provider boundary.
6. Transient network, rate-limit, and provider availability failures retain existing retry behavior.

### Test flow

- Unit-test casts are allowed for mocks, stubs, partial dependencies, and fixture construction.
- A test must not cast `job.data`, an external response, or malformed input merely to bypass the behavior under test.
- Negative tests provide raw invalid values and assert the actual Valibot/non-retryable failure path.

## <FailureModes>

### Invalid queue payload

Examples include missing fields, wrong primitive types, malformed URLs, unknown operation names, and stale payload shapes. Reject before business logic and do not retry when the failure is deterministically caused by payload validation. Preserve structured validation details in logs or job failure metadata without logging secrets.

### Transient queue/provider failure

Network errors, provider rate limits, temporary provider outages, Redis interruptions, and worker shutdown behavior remain subject to existing queue retry, backoff, rate-limit, and idempotency policies. They must not be misclassified as schema failures.

### Contradictory or incomplete provider data

Do not cast, coerce, or silently select a confident canonical value. Validate the response, preserve missing values where schemas allow them, and surface conflicts to the owning operation.

### Unknown caught errors

Do not cast caught values to `Error`. Use explicit narrowing such as `instanceof Error` or a safe error-normalization helper.

### Assertion-policy violation

Production assertions, broad eslint disables, suppression comments, or unsafe `any` usage fail lint/CI. Unit-test assertions remain permitted.

### Retry classification

The implementation must verify the BullMQ `UnrecoverableError` API and behavior against the installed `bullmq~5.65.1` typings. Tests must prove invalid payloads do not retry while transient failures still do.

## <TestPlan>

### `packages/schemata/src/index.test.ts`

Assert that each new or changed schema:

- accepts valid payloads;
- rejects missing and incorrectly typed fields;
- rejects malformed URLs/timestamps and invalid provider shapes;
- preserves intended transformations;
- does not silently convert uncertain data into confident data.

### `packages/queues/src/process.test.ts` or the existing queue processor test location

Mock operation handlers and BullMQ job values. Assert that:

- the correct schema is selected by operation name;
- valid data reaches the handler as parsed data;
- invalid data prevents handler invocation;
- unknown operations fail deterministically;
- validation failures use BullMQ’s non-retryable error mechanism;
- transient handler failures retain retryable behavior;
- duplicate delivery does not bypass validation or idempotency behavior.

### `packages/queues/src/index.test.ts` or the existing enqueue test location

Assert that queue enqueueing preserves operation identity, deduplication, queue limits, and existing priority behavior. Do not treat the TypeScript type of `data` as proof of runtime validity.

### Worker operation tests

In the owning worker, add or update tests beside changed operations:

- external adapter tests mock only the HTTP/provider client;
- raw response bodies are passed into the real Valibot validation;
- malformed, incomplete, contradictory, and rate-limited responses are covered where relevant;
- valid parsed values reach persistence or downstream enqueueing;
- invalid queue input is rejected before side effects.

Relevant locations include:

- `apps/discogs-worker/src/**/*.test.ts`
- `apps/lastfm-worker/src/**/*.test.ts`
- `apps/itunes-worker/src/**/*.test.ts`
- `apps/llm-worker/src/**/*.test.ts`
- `apps/telegram-worker/src/**/*.test.ts`
- `apps/internal-worker/src/**/*.test.ts`

### Lint and build verification

Run from the repository root:

```text
pnpm lint --fix
pnpm test --run
pnpm build
```

The implementation is incomplete if any required command fails or cannot be run.

## Compatibility impact

This changes production compile/lint policy and queue runtime behavior. Existing production casts must be removed, narrowed, or isolated behind surgical adapter exceptions. Invalid or stale persisted BullMQ payloads may fail permanently because backward compatibility is explicitly not required. Transient failure retry behavior must remain unchanged.

## Deferred decisions

Integration and end-to-end test casting rules are deferred until those test suites are introduced. At that time, their rules must be explicitly added rather than inferred from the unit-test exception.
