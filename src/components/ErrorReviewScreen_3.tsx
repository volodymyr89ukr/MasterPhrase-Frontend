import React, { useState } from "react";
import { useErrorPool } from "../contexts/ErrorPoolContext";
import { useTranslation } from "react-i18next";
import ExerciseSwitcher from "./ExerciseSwitcher";
import { Phrase } from "./ExerciseSwitcher";

interface ErrorPhraseItemProps {
  phrase: {
    phrase: string;
    translation?: string;
    stableId?: number;
    id?: number;
    [key: string]: any;
  };
}

function ErrorPhraseItem({ phrase }: ErrorPhraseItemProps) {
  return (
    <li className="p-4 bg-card rounded-lg shadow border border-border mb-3">
      <div className="text-lg font-semibold text-foreground mb-1">
        {phrase.phrase}
      </div>
      {phrase.translation && (
        <div className="text-sm text-muted-foreground italic">
          {phrase.translation}
        </div>
      )}
    </li>
  );
}

export default function ErrorReviewScreen() {
  const { t } = useTranslation();
  const { getErrorArray, clearErrors } = useErrorPool();
  const errors = getErrorArray();

  // ✅ Стан для режиму тренування
  const [isTraining, setIsTraining] = useState(false);

  const handleClearAll = () => {
    if (
      window.confirm(
        t(
          "confirm_clear_errors",
          "Ви впевнені, що хочете очистити всі помилки?"
        )
      )
    ) {
      clearErrors();
    }
  };

  const handleStartTraining = () => {
    if (errors.length === 0) return;
    setIsTraining(true);
  };

  const handleExitTraining = () => {
    setIsTraining(false);
  };

  // ✅ Якщо режим тренування активний, показуємо ExerciseSwitcher
  if (isTraining) {
    // Конвертуємо помилки в формат Phrase для ExerciseSwitcher
    const exerciseData: Phrase[] = errors.map((error, idx) => ({
      ...error,
      id: idx, // Локальний ID
      phrase_id: error.phrase_id,
      stableId: error.stableId ?? error.phrase_id ?? error.id,
      _fromErrorPool: true, // ✅ Позначаємо, що це з пулу помилок
      // Встановлюємо дефолтні значення, якщо їх немає
      options: error.options || [],
      answer: error.answer || "",
      matching_exercise: error.matching_exercise || [1, 2, 3],
      writing_exercise: error.writing_exercise || [2],
      explanation: error.explanation || "",
    }));

    return (
      <ExerciseSwitcher
        exerciseData={exerciseData}
        onBack={handleExitTraining}
        title={t("error_training", "Тренування помилок")}
        isErrorSession={true}
      />
    );
  }

  // ✅ Звичайний вигляд списку помилок
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">
          {t("error_pool", "Пул помилок")}
        </h1>

        {errors.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-2xl font-semibold text-foreground mb-2">
              {t("no_errors", "Вітаємо!")}
            </div>
            <div className="text-lg text-muted-foreground">
              {t(
                "no_errors_description",
                "У вас немає помилок для повторення."
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg text-muted-foreground">
                {t("total_errors", "Всього помилок")}: {errors.length}
              </div>
              <div className="flex gap-2">
                {/* ✅ КНОПКА "ТРЕНУВАТИ" */}
                <button
                  onClick={handleStartTraining}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold shadow-lg"
                >
                  {t("train_errors", "Тренувати")}
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  {t("clear_all", "Очистити все")}
                </button>
              </div>
            </div>

            <ul className="space-y-3">
              {errors.map((phrase) => (
                <ErrorPhraseItem
                  key={phrase.stableId || phrase.id}
                  phrase={phrase}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
