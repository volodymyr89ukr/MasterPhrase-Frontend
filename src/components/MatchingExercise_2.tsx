import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../AppContext";
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
  const { learningLanguage } = useAppContext();
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
    // window.speechSynthesis.cancel(); // замінено на cancelSpeak()

    return () => {
      if (speakTimeoutRef.current !== null)
        window.clearTimeout(speakTimeoutRef.current);
      cancelSpeak();
      // window.speechSynthesis.cancel(); // замінено на cancelSpeak()
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
          <div className="text-2xl mt-6 text-blue-700 font-bold">
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

    // Озвучуємо повну правильну фразу (без підстановок)
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
    <div className="flex flex-col h-full w-full items-stretch p-0 m-0">
      <div className="p-4 max-w-lg w-full min-w-[320px] mx-auto rounded-xl shadow bg-white">
        {/* Phrase with multiple blanks */}
        <div
          className="mb-2 text-2xl text-center font-medium min-h-[3.6em] max-h-[4.5em] overflow-hidden flex items-center justify-center"
          style={{ lineHeight: "1.2" }}
        >
          {maskedPhrase}
        </div>

        {/* Translation */}
        <div
          className="mb-6 text-base text-center text-gray-500 italic min-h-[2.4em] max-h-[3em] overflow-hidden flex items-center justify-center"
          style={{ lineHeight: "1.2" }}
        >
          {question.translation}
        </div>

        {/* Answer options */}
        <div
          className={`grid ${
            shuffledOptions.length === 3 ? "grid-cols-2" : "grid-cols-2"
          } gap-4 mb-4`}
        >
          {shuffledOptions.map((option, i) => (
            <button
              key={i}
              disabled={selected !== null}
              className={`py-2 px-4 rounded-xl shadow border 
              ${
                selected === option
                  ? option === question.answer
                    ? "bg-green-200 border-green-500"
                    : "bg-red-200 border-red-500"
                  : "bg-gray-50 border-gray-200"
              }
              hover:bg-blue-100 transition
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
        <div
          className={`mt-2 text-center min-h-[200px] max-h-[250px] transition-all duration-300 flex flex-col items-center justify-center ${
            showFeedback
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          aria-live="polite"
        >
          {showFeedback && (
            <div className="w-full">
              <div
                className={`text-lg font-bold mb-2 ${
                  feedback === t("correct") ? "text-green-600" : "text-red-600"
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
                  className="text-blue-600 hover:text-blue-800 focus:outline-none text-2xl mt-1"
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
                  className="flex items-center text-base text-gray-700 bg-gray-50 border-l-4 border-blue-400 p-1 rounded-md shadow-sm text-left flex-1 explanation-xs-font"
                >
                  {question.explanation}
                </div>
              </div>
              <button
                className="mt-4 py-2 px-6 rounded-xl bg-blue-500 text-white font-semibold shadow hover:bg-blue-600 transition"
                onClick={handleNext}
                autoFocus
              >
                {answerResult === "correct" && t("next")}
                {answerResult === "wrong" && t("try_again")}
              </button>
            </div>
          )}
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mt-6 mb-2">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{
              width: `${((progress ?? 0) / (total || 1)) * 100}%`,
            }}
          ></div>
        </div>
        <div className="text-sm text-gray-700 text-right mb-4">
          {progress ?? 0}/{total} {t("learned")}
        </div>
      </div>
    </div>
  );
}
