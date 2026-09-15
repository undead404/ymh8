// Емпіричний максимум для логарифмічної шкали.
// Наприклад, 10 млн слухачів * 100 млн прослуховувань = 10^15.
// Логарифм (log10) від 10^15 дорівнює 15.
// Завдяки хардкоду ми уникаємо важких SQL-запитів SELECT MAX(...) при кожному збереженні.
const MAX_LOG_POPULARITY = 15;

export default function calculateNextUpdateDate(
  date: null | string,
  { listeners, playcount }: { listeners: number; playcount: number },
) {
  // 1. Рахуємо абсолютну популярність (із захистом від множення на 0)
  const popularity = Math.max(listeners * playcount, 1);

  // 2. Нормалізуємо логарифм (від 0.0 до 1.0)
  const logPop = Math.log10(popularity);
  const normalizedPop = Math.min(logPop / MAX_LOG_POPULARITY, 1);

  // 3. Базовий інтервал (від 30 до 365 днів)
  const baseDays = 30 + 335 * (1 - normalizedPop);

  // 4. Фактор свіжості (Recency multiplier)
  let multiplier = 1;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const albumDate = new Date(date);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Якщо альбом вийшов менш ніж рік тому, пришвидшуємо оновлення вдвічі
    if (albumDate >= oneYearAgo) {
      multiplier = 0.5;
    }
  }

  // 5. Фінальний інтервал: не менше 30 днів + Jitter (+/- 7 днів)
  const targetDays = Math.max(30, baseDays * multiplier);
  const jitter = Math.random() * 14 - 7;
  const finalDays = targetDays + jitter;

  // 6. Обчислюємо точну дату для бази
  return new Date(Date.now() + finalDays * 24 * 60 * 60 * 1000);
}
