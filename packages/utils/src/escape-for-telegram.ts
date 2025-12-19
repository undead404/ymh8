export default function escapeForTelegram(text: string) {
  return text
    .replaceAll('_', String.raw`\_`)
    .replaceAll('*', String.raw`\*`)
    .replaceAll('[', String.raw`\[`)
    .replaceAll(']', String.raw`\]`)
    .replaceAll('(', String.raw`\(`)
    .replaceAll(')', String.raw`\)`)
    .replaceAll('~', String.raw`\~`)
    .replaceAll('`', '\\`')
    .replaceAll('>', String.raw`\>`)
    .replaceAll('#', String.raw`\#`)
    .replaceAll('+', String.raw`\+`)
    .replaceAll('-', String.raw`\-`)
    .replaceAll('=', String.raw`\=`)
    .replaceAll('|', String.raw`\|`)
    .replaceAll('{', String.raw`\{`)
    .replaceAll('}', String.raw`\}`)
    .replaceAll('.', String.raw`\.`)
    .replaceAll('!', String.raw`\!`);
  // .slice(0, 1023);
}
