import type Anthropic from '@anthropic-ai/sdk';

export default function extractTextContent(
  content: Anthropic.ContentBlock[],
): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}
