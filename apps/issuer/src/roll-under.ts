export default function rollUnder(fraction: number) {
  if (fraction <= 0 || fraction > 1) {
    throw new Error('Wrong fraction');
  }
  return Math.random() < fraction;
}
