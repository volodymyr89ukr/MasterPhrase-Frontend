import React, { useState, useEffect, useRef } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { speakSmart, cancelSpeak } from "../utils/ttsUtils";
import { useTranslation } from "react-i18next";

export interface Phrase {
  phrase: string;
  translation: string;
  options: string[];
  answer: string;
  // allow array or number (backward-compat)
  matching_exercise: number | number[];
  explanation?: string;
  id?: number;
}

export interface MatchingExerciseProps {
  question: Phrase | null;
  pool: Phrase[];
  onAnswer?: (option: string | null) => void;
  progress: number;
  total: number;
  isTransitioning?: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// normalize matching indices into 1-based unique sorted array
function normalizeMaskIndices(idx: number | number[] | undefined): number[] {
  if (idx == null) return [];
  const arr = Array.isArray(idx) ? idx : [idx];
  const nums = arr
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function getMaskedPhrase(phrase: string, maskIndices: number[]): string {
  if (!maskIndices.length) return phrase;
  const maskSet = new Set(maskIndices);
  const words = phrase.split(/\s+/);
  return words.map((w, i) => (maskSet.has(i + 1) ? "__________" : w)).join(" ");
}

export default function MatchingExercise({
  question,
  pool,
  onAnswer,
  progress,
  total,
  isTransitioning = false,
}: MatchingExerciseProps) {
  const { t } = useTranslation();
  const { learningLanguage } = useSettings();
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [answerResult, setAnswerResult] = useState<"correct" | "wrong" | null>(
    null
  );
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!question) return;
    setShuffledOptions(shuffleArray(question.options));
    setSelected(null);
    setShowFeedback(false);
    setFeedback("");
    setAnswerResult(null);
    setIsSpeaking(false);
    if (speakTimeoutRef.current !== null)
      window.clearTimeout(speakTimeoutRef.current);
    cancelSpeak();

    return () => {
      if (speakTimeoutRef.current !== null)
        window.clearTimeout(speakTimeoutRef.current);
      cancelSpeak();
    };
  }, [question]);

  if (isTransitioning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] py-12">
        <div className="flex flex-col items-center">
          <div className="relative">
            <span
              className="block text-6xl animate-bounce"
              style={{ animationDelay: "0.1s" }}
            >
              🎉
            </span>
            <span
              className="block text-4xl animate-bounce"
              style={{ animationDelay: "0.3s" }}
            >
              🥳
            </span>
          </div>
          <div className="text-2xl mt-6 text-muted-foreground font-bold">
            {t("great_find_correct_translation")}
          </div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const maskIndices = normalizeMaskIndices(question.matching_exercise);
  const maskedPhrase = getMaskedPhrase(question.phrase, maskIndices);

  const handleSelect = (option: string) => {
    if (!question) return;
    const isCorrect = option === question.answer;
    setSelected(option);
    setAnswerResult(isCorrect ? "correct" : "wrong");
    setFeedback(isCorrect ? t("correct") : t("wrong"));
    setShowFeedback(true);

    setIsSpeaking(true);
    if (speakTimeoutRef.current !== null)
      window.clearTimeout(speakTimeoutRef.current);
    cancelSpeak();
    speakSmart(question.phrase, {
      lang: learningLanguage?.code || "de-DE",
      rate: 0.85,
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    speakTimeoutRef.current = window.setTimeout(
      () => setIsSpeaking(false),
      2500
    );
  };

  const handleNext = () => {
    cancelSpeak();
    setSelected(null);
    setShowFeedback(false);
    setFeedback("");
    setAnswerResult(null);
    setIsSpeaking(false);
    if (speakTimeoutRef.current !== null)
      window.clearTimeout(speakTimeoutRef.current);
    if (onAnswer) onAnswer(selected);
  };

  return (
    <div className="flex flex-col h-full w-full items-stretch p-0 m-0 bg-background">
      {/* === 1. ВЕРХНЯ СКРОЛОВАНА ЗОНА === */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 max-w-lg w-full mx-auto">
          {/* Phrase with multiple blanks */}
          <div
            className="mb-2 text-2xl text-center font-medium min-h-[3.6em] flex items-center justify-center text-card-foreground break-words"
            style={{ lineHeight: "1.2" }}
          >
            {maskedPhrase}
          </div>

          {/* Translation */}
          <div
            className="mb-6 text-base text-center text-muted-foreground italic min-h-[2.4em] flex items-center justify-center break-words"
            style={{ lineHeight: "1.2" }}
          >
            {question.translation}
          </div>

          {/* Answer options */}
          <div
            className={`grid ${
              shuffledOptions.length === 3 ? "grid-cols-2" : "grid-cols-2"
            } gap-3 mb-6`}
          >
            {shuffledOptions.map((option, i) => (
              <button
                key={i}
                disabled={selected !== null}
                className={`py-3 px-4 rounded-xl shadow border transition-all duration-150 min-h-[48px] flex items-center justify-center text-center
                active:scale-[0.97] focus-ring
                ${
                  selected === option
                    ? option === question.answer
                      ? "bg-success/20 border-success"
                      : "bg-destructive/20 border-destructive animate-shake"
                    : "bg-card border-border"
                }
                hover:bg-accent
                ${
                  shuffledOptions.length === 3 && i === 2
                    ? "col-span-2 mx-auto w-2/3"
                    : ""
                }
              `}
                onClick={() => handleSelect(option)}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Feedback and explanation */}
          {showFeedback && (
            <div className="mt-2 text-center" aria-live="polite">
              <div
                className={`text-lg font-bold mb-2 ${
                  feedback === t("correct")
                    ? "text-success"
                    : "text-destructive"
                }`}
              >
                {feedback}
              </div>
              <div className="flex items-start gap-2 mt-2 max-w-xl mx-auto">
                <button
                  onClick={() => {
                    cancelSpeak();
                    speakSmart(question.phrase, {
                      lang: learningLanguage?.code || "de-DE",
                    });
                  }}
                  title={t("listen_again")}
                  className="text-primary hover:text-primary/80 focus:outline-none text-2xl mt-1 transition-colors"
                  aria-label={t("listen_again")}
                >
                  🔊
                </button>
                <div
                  style={{
                    minHeight: "4.8em",
                    maxHeight: "4.8em",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    wordBreak: "break-word",
                  }}
                  className="flex items-center text-base text-muted-foreground bg-muted border-l-4 border-primary p-1 rounded-md shadow-sm text-left flex-1 explanation-xs-font"
                >
                  {question.explanation}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === 2. НИЖНЯ ФІКСОВАНА ЗОНА (КНОПКА "ДАЛІ") === */}
      {showFeedback && (
        <div className="flex-shrink-0 w-full border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-auto p-4">
            <button
              className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg hover:bg-primary/90 transition-colors active:scale-[0.98]"
              onClick={handleNext}
              autoFocus
            >
              {answerResult === "correct" && t("next")}
              {answerResult === "wrong" && t("try_again")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
