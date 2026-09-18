import { UnrecoverableError } from 'bullmq';

function getErrorDetails(error: unknown): { message: string; status?: number } {
  if (error instanceof Error) {
    const status =
      'status' in error && typeof error.status === 'number'
        ? error.status
        : undefined;
    return status === undefined
      ? { message: error.message }
      : { message: error.message, status };
  }

  return { message: String(error) };
}

export default function throwIfProviderHasNoCredits(error: unknown): void {
  const { message, status } = getErrorDetails(error);
  const lowercasedMessage = message.toLowerCase();
  const hasNoCredits =
    lowercasedMessage.includes('no credits remaining') ||
    lowercasedMessage.includes('insufficient_quota');

  if (status === 429 && hasNoCredits) {
    throw new UnrecoverableError(
      `The LLM provider has no credits remaining. Add credits to continue using the API.\n${message}`,
    );
  }
}
