export default function escapeForTelegram(text: string) {
  if (!text) return '';

  return text
    .replaceAll('&', '&amp;') // Must be first!
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
