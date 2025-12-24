/**
 *
 * @param text Contains a message for Telegram API with HTML parser mode
 * @returns Returns a valid Telegram API message for HTML parser mode
 */
export default function escapeForTelegram(text: string) {
  if (!text) return '';

  return text
    .replaceAll('&', '&amp;') // Must be first!
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
