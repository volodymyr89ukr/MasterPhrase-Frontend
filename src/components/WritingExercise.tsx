import React, {
  useState,
  useRef,
  useEffect,
  ChangeEvent,
  KeyboardEvent,
} from "react";
import { useAppContext } from "../AppContext";
import { speakSmart } from "../utils/ttsUtils";
import { useTranslation } from "react-i18next";

interface Phrase {
  phrase: string;
  translation?: string;
  writing_exercise?: string | number;
  wordIndexToWrite?: number; // для сумісності
  [key: string]: any;
}

interface WritingExerciseProps {
  phrases: Phrase[];
  onComplete?: () => void;
}

// --- Повертає слово за індексом (1-based) ---
function getWordByIndex(str: string, idx: number): string {
  const words = str.split(/\s+/);
  if (idx < 1 || idx > words.length) return "";
  return words[idx - 1].replace(/[.,?!;:"“”]/g, "");
}

function maskWord(word: string): string {
  return "_".repeat(Math.max(word.length, 8));
}
function getHint(word: string): string {
  if (word.length <= 2) return word[0] || "";
  if (word.length <= 4) return word.slice(0, 2);
  return word.slice(0, 3);
}

export default function WritingExercise({
  phrases = [],
  onComplete,
}: WritingExerciseProps) {
  const { t } = useTranslation();
  const { learningLanguage } = useAppContext();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [inputStatus, setInputStatus] = useState<
    "default" | "wrong" | "correct"
  >("default");
  const [showFeedback, setShowFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [showFixHint, setShowFixHint] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const fixHintTimeoutRef = useRef<number | null>(null);

  // --- Прогрів TTS ---
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const utter = new window.SpeechSynthesisUtterance(" .");
      utter.lang = learningLanguage?.code || "de-DE";
      utter.volume = 0;
      window.speechSynthesis.speak(utter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Скидання стану при нових phrases
  useEffect(() => {
    setCurrentIdx(0);
    setUserInput("");
    setInputStatus("default");
    setCompleted(false);
    setHintLevel(0);
    setShowFeedback(false);
    setShowFixHint(false);
    if (fixHintTimeoutRef.current) {
      window.clearTimeout(fixHintTimeoutRef.current);
      fixHintTimeoutRef.current = null;
    }
  }, [phrases]);

  useEffect(() => {
    setUserInput("");
    setInputStatus("default");
    setHintLevel(0);
    setShowFeedback(false);
    setShowFixHint(false);
    if (fixHintTimeoutRef.current) {
      window.clearTimeout(fixHintTimeoutRef.current);
      fixHintTimeoutRef.current = null;
    }
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [currentIdx]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
      if (fixHintTimeoutRef.current) {
        window.clearTimeout(fixHintTimeoutRef.current);
      }
    };
  }, []);

  if (!phrases.length)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50">
        <div className="text-xl text-gray-700">
          {t("no_phrases_for_writing")}
        </div>
      </div>
    );

  if (completed)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50">
        <div className="text-4xl mb-3">🎉</div>
        <div className="text-2xl font-bold mb-3">
          {t("writing_block_completed")}
        </div>
        <button
          onClick={() => {
            setCurrentIdx(0);
            setUserInput("");
            setCompleted(false);
            setHintLevel(0);
            setShowFeedback(false);
            if (onComplete) onComplete();
          }}
          className="mt-2 py-3 px-8 rounded-2xl bg-blue-500 text-white text-lg font-semibold shadow hover:bg-blue-600 transition"
        >
          {t("proceed_to_next_block")}
        </button>
      </div>
    );

  // Поточна фраза
  const obj = phrases[currentIdx];
  const wordIndex =
    typeof obj.writing_exercise === "number"
      ? obj.writing_exercise
      : parseInt(obj.writing_exercise as string, 10) || 2;

  const phraseWords = obj.phrase.split(/\s+/);
  const targetWord = getWordByIndex(obj.phrase, wordIndex);

  const maskedPhrase = phraseWords
    .map((w, i) => {
      if (i === wordIndex - 1) {
        if (hintLevel === 2) return targetWord;
        if (hintLevel === 1)
          return (
            getHint(targetWord) +
            maskWord(targetWord).slice(getHint(targetWord).length)
          );
        return maskWord(targetWord);
      }
      return w;
    })
    .join(" ");

  // Автоматична перевірка на кожен символ
  useEffect(() => {
    if (userInput === "") {
      setInputStatus("default");
      setShowFixHint(false);
      if (fixHintTimeoutRef.current) {
        window.clearTimeout(fixHintTimeoutRef.current);
        fixHintTimeoutRef.current = null;
      }
      return;
    }
    if (targetWord.startsWith(userInput.trim())) {
      setInputStatus("default");
      setShowFixHint(false);
      if (
        userInput.trim() === targetWord &&
        userInput.trim().length === targetWord.length
      ) {
        setInputStatus("correct");
        speakSmart(obj.phrase, { lang: learningLanguage?.code || "de-DE" });
        if (feedbackTimeoutRef.current) {
          window.clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = window.setTimeout(() => {
          if (currentIdx < phrases.length - 1) {
            setCurrentIdx((idx) => idx + 1);
            setUserInput("");
            setHintLevel(0);
            setInputStatus("default");
          } else {
            setCompleted(true);
            if (onComplete) onComplete();
          }
        }, 1100);
      }
    } else {
      setInputStatus("wrong");
      setShowFixHint(false);
      if (fixHintTimeoutRef.current) {
        window.clearTimeout(fixHintTimeoutRef.current);
      }
      fixHintTimeoutRef.current = window.setTimeout(() => {
        setShowFixHint(true);
      }, 1000);
      if (window.navigator.vibrate) window.navigator.vibrate(120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userInput,
    targetWord,
    currentIdx,
    phrases.length,
    onComplete,
    obj.phrase,
    learningLanguage,
  ]);

  // Підказки
  const handleHintPart = () => {
    if (hintLevel < 1) setHintLevel(1);
  };
  const handleHintAll = () => {
    setHintLevel(2);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (userInput.trim() === targetWord) {
        setInputStatus("correct");
        setHintLevel(0);
        speakSmart(obj.phrase, { lang: learningLanguage?.code || "de-DE" });
        if (feedbackTimeoutRef.current) {
          window.clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = window.setTimeout(() => {
          if (currentIdx < phrases.length - 1) {
            setCurrentIdx((idx) => idx + 1);
            setUserInput("");
            setHintLevel(0);
            setInputStatus("default");
          } else {
            setCompleted(true);
            if (onComplete) onComplete();
          }
        }, 1100);
      } else {
        setInputStatus("wrong");
        setShowFixHint(false);
        if (fixHintTimeoutRef.current) {
          window.clearTimeout(fixHintTimeoutRef.current);
        }
        fixHintTimeoutRef.current = window.setTimeout(() => {
          setShowFixHint(true);
        }, 1000);
        if (window.navigator.vibrate) window.navigator.vibrate(120);
      }
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
    if (
      inputStatus === "wrong" &&
      targetWord.startsWith(e.target.value.trim())
    ) {
      setInputStatus("default");
      setShowFixHint(false);
      if (fixHintTimeoutRef.current) {
        window.clearTimeout(fixHintTimeoutRef.current);
      }
    }
  };

  const inputColorClass =
    inputStatus === "correct"
      ? "border-green-400 bg-green-50"
      : inputStatus === "wrong"
      ? "border-red-400 bg-red-50 animate-shake"
      : "border-blue-300 bg-blue-50 focus:border-blue-500";

  return (
    <div className="flex flex-col h-full w-full items-stretch p-0 m-0">
      <div className="p-4 max-w-lg w-full min-w-[320px] mx-auto rounded-xl shadow bg-white flex flex-col items-center">
        <div className="text-base sm:text-lg text-gray-600 italic text-center min-h-[2em]">
          {obj.translation}
        </div>
        <div
          className="text-2xl sm:text-3xl text-center font-semibold min-h-[2.7em] px-2 sm:px-6 py-2"
          style={{ letterSpacing: "0.02em", wordBreak: "break-word" }}
        >
          {maskedPhrase}
        </div>
        <input
          ref={inputRef}
          type="text"
          className={`text-xl sm:text-2xl text-center px-5 py-3 rounded-lg border-2 outline-none shadow transition-all duration-200 w-full max-w-[90vw] ${inputColorClass}`}
          style={{
            fontFamily: "inherit",
            letterSpacing: "0.04em",
          }}
          value={userInput}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          placeholder={t("enter_word_or_press_enter")}
          autoCapitalize="off"
        />
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 w-full justify-center mt-5">
          <button
            onClick={handleHintPart}
            disabled={hintLevel >= 1}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl border bg-gray-100 hover:bg-blue-100 text-base transition ${
              hintLevel >= 1 ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {t("show_part_of_word")}
          </button>
          <button
            onClick={handleHintAll}
            disabled={hintLevel >= 2}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl border bg-gray-100 hover:bg-blue-100 text-base transition ${
              hintLevel >= 2 ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {t("show_whole_word")}
          </button>
        </div>
        <div className="text-base text-gray-400 min-h-[1.8em] mt-1 text-center">
          {inputStatus === "correct"
            ? t("correct")
            : t("enter_word_or_press_enter")}
        </div>
        {showFixHint && inputStatus === "wrong" && (
          <div className="mt-2 text-base text-red-500 animate-shake text-center">
            {t("fix_the_word_error")}
          </div>
        )}
        <style>
          {`
              .animate-shake {
                animation: shake 0.22s cubic-bezier(.36,.07,.19,.97) both;
              }
              @keyframes shake {
                10%, 90% { transform: translateX(-2px); }
                20%, 80% { transform: translateX(4px); }
                30%, 50%, 70% { transform: translateX(-6px); }
                40%, 60% { transform: translateX(6px); }
              }
            `}
        </style>
      </div>
      <div className="py-3 text-gray-600 text-base font-medium text-center select-none">
        {t("phrases_count", { current: currentIdx + 1, total: phrases.length })}
      </div>
    </div>
  );
}
