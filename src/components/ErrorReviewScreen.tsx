import React from "react";
import { useErrorPool } from "../contexts/ErrorPoolContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import BackButton from "./BackButton";
import { Phrase } from "./ExerciseSwitcher"; // Імпортуємо тип

// Допоміжна функція для отримання 1-базованих індексів слів, які були відповіддю
function normalizeMaskIndices(idx: number | number[] | undefined): Set<number> {
  if (idx == null) return new Set();
  const arr = Array.isArray(idx) ? idx : [idx];
  const nums = arr
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  return new Set(nums); // Повертаємо Set для швидкої перевірки O(1)
}

// Новий компонент для відображення одного елемента помилки
const ErrorPhraseItem: React.FC<{ phrase: Phrase }> = ({ phrase }) => {
  const answerIndices = normalizeMaskIndices(phrase.matching_exercise);
  // Розділяємо фразу на слова та розділові знаки, зберігаючи їх
  const wordsAndPunctuation = phrase.phrase
    .split(/(\s+|[,.;!?])/)
    .filter(Boolean);

  let wordIndex = 0; // Лічильник для слів (ігноруємо пробіли/пунктуацію)

  return (
    <li className="bg-card p-4 rounded-lg shadow border border-border text-lg text-card-foreground">
      {wordsAndPunctuation.map((part, index) => {
        // Перевіряємо, чи це слово (не пробіл, не пунктуація)
        const isWord = !/^\s+$|^[,.;!?]$/.test(part);
        let currentIndex = 0;
        if (isWord) {
          wordIndex++;
          currentIndex = wordIndex;
        }

        // Якщо це слово і його індекс збігається з індексом відповіді
        if (isWord && answerIndices.has(currentIndex)) {
          return (
            <span
              key={index}
              className="font-bold text-blue-600 dark:text-blue-400"
            >
              {part}
            </span>
          );
        } else {
          // Інакше повертаємо слово/пробіл/пунктуацію як є
          return <span key={index}>{part}</span>;
        }
      })}
    </li>
  );
};

export default function ErrorReviewScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getErrorArray } = useErrorPool();
  const errors = getErrorArray();

  return (
    <div className="w-full h-full flex flex-col max-w-3xl min-w-[320px] mx-auto overflow-hidden">
      {/* Фіксований хедер */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <BackButton to="/" />
          <h2 className="text-xl font-bold text-foreground">
            {t("error_review_title", "Перегляд помилок")} ({errors.length})
          </h2>
        </div>
      </div>

      {/* Скролована зона */}
      {/* Додано pb-20 для безпечної зони внизу */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 min-h-0">
        {errors.length === 0 ? (
          <div className="text-center text-muted-foreground p-8 bg-card rounded-xl shadow">
            {t("error_pool_empty", "Вітаємо, у вас немає помилок!")}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {/* Використовуємо stableId як ключ для надійності */}
            {errors.map((phrase) => (
              <ErrorPhraseItem
                key={phrase.stableId || phrase.id}
                phrase={phrase}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
