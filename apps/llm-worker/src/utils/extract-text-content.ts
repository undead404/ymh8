export default function extractTextContent(response: unknown): string {
  if (
    typeof response !== 'object' ||
    response === null ||
    !('output_text' in response) ||
    typeof response.output_text !== 'string' ||
    response.output_text.trim() === ''
  ) {
    throw new Error('OpenAI response did not contain non-empty text');
  }

  return response.output_text;
}
