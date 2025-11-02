import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useErrorPool } from "../contexts/ErrorPoolContext";
import { useTranslation } from "react-i18next";
import { useSettings } from "../contexts/SettingsContext";
import ExerciseSwitcher from "./ExerciseSwitcher";
import { Phrase } from "./ExerciseSwitcher";
import BackButton from "./BackButton";
import { speakSmart } from "../utils/ttsUtils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/Card";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";

interface ErrorPhraseItemProps {
  phrase: {
    phrase: string;
    translation?: string;
    stableId?: number;
    id?: number;
    [key: string]: any;
  };
  onRemove: () => void;
}

function ErrorPhraseItem({ phrase, onRemove }: ErrorPhraseItemProps) {
  const { learningLanguage } = useSettings();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) return;

    setIsSpeaking(true);
    speakSmart(phrase.phrase, {
      lang: learningLanguage?.code || "de-DE",
      rate: 0.85,
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  return (
    <li
      onClick={() => setIsFlipped(!isFlipped)}
      className="p-4 bg-card rounded-lg shadow border border-border mb-3 cursor-pointer hover:bg-accent/50 transition-all duration-300 relative"
      style={{
        transformStyle: "preserve-3d",
        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}
    >
      <div
        style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(0deg)",
        }}
        className={isFlipped ? "hidden" : "block"}
      >
        {/* Лицьова сторона - фраза */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={handleSpeak}
              disabled={isSpeaking}
              className="flex-shrink-0 p-1.5 rounded-full hover:bg-accent transition-colors disabled:opacity-50"
              aria-label="Прослухати"
            >
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={
                  isSpeaking
                    ? "text-primary animate-pulse"
                    : "text-muted-foreground"
                }
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </button>
            <div className="text-lg font-semibold text-foreground flex-1 min-w-0 break-words">
              {phrase.phrase}
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Видалити"
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
        <div className="text-xs text-muted-foreground mt-2 italic">
          Натисніть, щоб побачити переклад
        </div>
      </div>

      <div
        style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          position: isFlipped ? "relative" : "absolute",
          top: 0,
          left: 0,
          right: 0,
        }}
        className={isFlipped ? "block" : "hidden"}
      >
        {/* Зворотна сторона - переклад */}
        <div className="p-4">
          {phrase.translation && (
            <div className="text-lg text-foreground italic">
              {phrase.translation}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-2">
            Натисніть, щоб повернутися
          </div>
        </div>
      </div>
    </li>
  );
}

function ConfirmClearModal({
  isOpen,
  errorCount,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  errorCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 animate-fade-in">
        <CardHeader>
          <CardTitle>
            {t("confirm_clear_title", "Підтвердження видалення")}
          </CardTitle>
          <CardDescription>
            {t(
              "confirm_clear_message",
              `Ви впевнені, що хочете видалити всі ${errorCount} помилок? Цю дію неможливо скасувати.`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onCancel}>
              {t("cancel", "Скасувати")}
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              {t("confirm_delete", "Видалити все")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ErrorReviewScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getErrorArray, clearErrors, removeErrors } = useErrorPool();
  const errors = getErrorArray();

  const [isTraining, setIsTraining] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const frozenErrorsRef = useRef<Phrase[]>([]);

  const handleClearAll = () => {
    setShowConfirmClear(true);
  };

  const confirmClearAll = () => {
    clearErrors();
    setShowConfirmClear(false);
  };

  const handleRemoveError = (stableId: number | undefined) => {
    if (stableId) {
      removeErrors([stableId]);
    }
  };

  const handleStartTraining = () => {
    if (errors.length === 0) return;

    frozenErrorsRef.current = errors.map((error, idx) => ({
      ...error,
      id: idx,
      phrase_id: error.phrase_id,
      stableId: error.stableId ?? error.phrase_id ?? error.id,
      _fromErrorPool: true,
      options: error.options || [],
      answer: error.answer || "",
      matching_exercise: error.matching_exercise || [1, 2, 3],
      writing_exercise: error.writing_exercise || [2],
      explanation: error.explanation || "",
    }));

    console.log("🚀 Starting error training session", {
      totalErrors: frozenErrorsRef.current.length,
      exerciseData: frozenErrorsRef.current.map((e) => ({
        phrase: e.phrase,
        stableId: e.stableId,
        _fromErrorPool: e._fromErrorPool,
      })),
    });

    setIsTraining(true);
  };

  const handleExitTraining = () => {
    setIsTraining(false);
    frozenErrorsRef.current = [];
  };

  if (isTraining) {
    return (
      <ExerciseSwitcher
        exerciseData={frozenErrorsRef.current}
        onBack={handleExitTraining}
        title={t("error_training", "Тренування помилок")}
        isErrorSession={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Кнопка назад */}
        <div className="mb-4">
          <BackButton to="/" />
        </div>

        {/* Заголовок з кількістю помилок */}
        <h1 className="text-3xl font-bold text-foreground mb-6">
          {t("error_pool", "Помилки")} ({errors.length})
        </h1>

        {errors.length === 0 ? (
          <EmptyState
            icon={
              <svg
                width={48}
                height={48}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="text-primary"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
            title={t("no_errors", "Вітаємо!")}
            description={t(
              "no_errors_description",
              "У вас немає помилок для повторення."
            )}
          />
        ) : (
          <>
            {/* Кнопка тренування та посилання очищення */}
            <div className="mb-6 flex flex-col items-center gap-2">
              <Button
                onClick={handleStartTraining}
                size="lg"
                className="w-full max-w-sm shadow-lg"
              >
                {t("train_errors", "Тренувати")}
              </Button>
              <button
                onClick={handleClearAll}
                className="text-sm text-muted-foreground hover:text-destructive transition-colors underline-offset-4 hover:underline"
              >
                {t("or_clear_all", "...або Очистити все")}
              </button>
            </div>

            {/* Список помилок */}
            <ul className="space-y-3">
              {errors.map((phrase) => (
                <ErrorPhraseItem
                  key={phrase.stableId || phrase.id}
                  phrase={phrase}
                  onRemove={() =>
                    handleRemoveError(phrase.stableId || phrase.id)
                  }
                />
              ))}
            </ul>
          </>
        )}

        {/* Модальне вікно підтвердження */}
        <ConfirmClearModal
          isOpen={showConfirmClear}
          errorCount={errors.length}
          onConfirm={confirmClearAll}
          onCancel={() => setShowConfirmClear(false)}
        />
      </div>
    </div>
  );
}
