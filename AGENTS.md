# Repository Agent Instructions

## Architecture and routing

- Preserve the pnpm workspace boundaries: application code belongs in `apps/*`; reusable code belongs in `packages/*`.
- All external requests and provider-specific integrations must be implemented in the owning worker under `apps/`: `discogs-worker` for Discogs, `lastfm-worker` for Last.fm, `itunes-worker` for iTunes, `llm-worker` for LLM providers, and `telegram-worker` for Telegram.
- Internal orchestration must be implemented in `apps/internal-worker/`. This includes list generation, build and deployment triggering, work planning, and queue enqueueing. Database access may be used from any app or package through `packages/database`; do not route it through `apps/internal-worker/` solely for database access.
- Do not put external provider requests in `apps/internal-worker/`, and do not move internal orchestration into provider workers.
- Use the existing ESM TypeScript conventions and `.js` extensions in relative imports.

## Shared code and contracts

- Before adding a helper, inspect `packages/` and existing app code for reusable behavior.
- Prefer extracting genuinely reusable, domain-neutral code into an appropriate existing package instead of copying it between apps.
- Use `packages/queues/` for shared BullMQ behavior, queue utilities, worker setup, and rate-limiting mechanisms.
- Use `packages/schemata/` for shared validation schemas and cross-worker payload contracts.
- Use `packages/database/` for shared database access and `packages/utils/` for domain-neutral utilities.
- Do not weaken TypeScript types, bypass schemas, invent duplicate contracts, or introduce circular package dependencies.

## Queues and external-provider protection

- BullMQ is an external-provider protection boundary, not merely a background-task mechanism.
- External work must go through the appropriate queue and must not bypass queue processing with direct calls from internal orchestration.
- Every new external workload must define or preserve appropriate queue ownership, concurrency/rate limits, timeout behavior, retry behavior, and idempotency behavior.
- Reuse the existing queue and worker limiting patterns before introducing new throttling mechanisms.
- Treat provider rate limits, transient failures, stalled jobs, duplicate delivery, shutdown, and partial completion as expected failure cases.
- Do not increase concurrency or remove limits without documenting and testing the effect on the provider and queue.

## Data quality

- Treat external metadata as incomplete, inconsistent, and uncertain.
- Validate external responses at the integration boundary.
- Preserve missing values and surface conflicting provider data; do not silently convert uncertain data into confident canonical data.
- Add tests for malformed, incomplete, contradictory, and rate-limited provider responses when relevant.

## Type safety and runtime boundaries

- Production source must not use unchecked type assertions (`as`), non-null assertions, `any`, `@ts-ignore`, or `@ts-expect-error` to cross an untrusted boundary.
- Unit tests may use any type casts for mocks, stubs, partial dependencies, and fixture construction. They must not cast BullMQ payloads or external data to bypass the behavior under test.
- Treat external responses, environment variables, database JSON, caught errors, and BullMQ data as untrusted until Valibot validation or explicit control-flow narrowing succeeds.
- Every BullMQ operation must validate `job.data` before business logic. Deterministically invalid payloads must fail without retry when BullMQ supports that classification.
- An unavoidable production adapter assertion requires a surgical local eslint-disable directive with a reason; broad disables are not permitted.

## Tests and verification

- Every code change must be covered by unit tests for the changed behavior. Tests must cover relevant success and failure paths, including malformed external data, retries, idempotency, and queue behavior.
- Existing uncovered code in changed files may be covered retroactively as part of the change.
- Do not delete, weaken, or bypass tests to make a change pass.
- Before declaring any change complete, run all of these commands from the repository root:

  ```text
  pnpm lint --fix
  pnpm test --run
  pnpm build
  ```

- Report every verification command, its result, and any command that could not be run. A change with failing or unrun required checks is not complete.

## Change discipline

- Keep changes focused and consistent with existing patterns.
- Do not modify unrelated files, generated `dist/` output, build artifacts, lockfiles, secrets, or environment files unless the task explicitly requires it.
- Do not silently resolve ambiguity involving paths, public contracts, schemas, authentication, persistence, retries, or failure behavior; ask for clarification.
- When a task changes a public contract, queue payload, schema, persistence behavior, or retry semantics, explain the compatibility impact and update affected tests.
