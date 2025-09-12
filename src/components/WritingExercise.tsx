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
  // allow array or scalar (backward-compat)
  writing_exercise?: number | string | Array<number | string>;
  wordIndexToWrite?: number; // legacy, not used anymore
  [key: string]: any;
}

interface WritingExerciseProps {
  phrases: Phrase[];
  onComplete?: () => void;
}

const WRITING_NEXT_DELAY_MS = 3400;

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

// normalize indices into 1-based unique sorted array with a sane default [2]
function normalizeTargetIndices(input: Phrase["writing_exercise"]): number[] {
  if (input == null) return [2];
  const arr = Array.isArray(input) ? input : [input];
  const nums = arr
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  const uniq = Array.from(new Set(nums)).sort((a, b) => a - b);
  return uniq.length ? uniq : [2];
}

function normalizeText(s: string): string {
  try {
    return s
      .normalize("NFC")
      .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
      .trim();
  } catch {
    return s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, "").trim();
  }
}

export default function WritingExercise({
  phrases = [],
  onComplete,
}: WritingExerciseProps) {
  const { t } = useTranslation();
  const { learningLanguage } = useAppContext();
  const [currentIdx, setCurrentIdx] = useState(0);
  // index of current target within the normalized indices list
  const [targetPos, setTargetPos] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [inputStatus, setInputStatus] = useState<
    "default" | "wrong" | "correct"
  >("default");
  const [completed, setCompleted] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [showFixHint, setShowFixHint] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const fixHintTimeoutRef = useRef<number | null>(null);
  const lastSelectionRef = useRef<{ start: number; end: number } | null>(null);

  // special chars
  function getSpecialCharsForLanguage(code?: string): string[] {
    if (!code) return [];
    const lang = code.toLowerCase();
    if (lang.startsWith("de")) return ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];
    if (lang.startsWith("es"))
      return [
        "á",
        "é",
        "í",
        "ó",
        "ú",
        "ü",
        "ñ",
        "Á",
        "É",
        "Í",
        "Ó",
        "Ú",
        "Ü",
        "Ñ",
      ];
    if (lang.startsWith("fr"))
      return [
        "à",
        "â",
        "ç",
        "é",
        "è",
        "ê",
        "ë",
        "ï",
        "î",
        "ô",
        "ù",
        "û",
        "ü",
        "œ",
        "æ",
      ];
    if (lang.startsWith("it")) return ["à", "è", "é", "ì", "ò", "ù"];
    if (lang.startsWith("pt"))
      return ["á", "â", "ã", "à", "ç", "é", "ê", "í", "ó", "ô", "õ", "ú", "ü"];
    if (lang.startsWith("pl"))
      return [
        "ą",
        "ć",
        "ę",
        "ł",
        "ń",
        "ó",
        "ś",
        "ź",
        "ż",
        "Ą",
        "Ć",
        "Ę",
        "Ł",
        "Ń",
        "Ó",
        "Ś",
        "Ź",
        "Ż",
      ];
    if (lang.startsWith("tr"))
      return ["ç", "ğ", "ı", "İ", "ö", "ş", "ü", "Ç", "Ğ", "Ö", "Ş", "Ü"];
    if (lang.startsWith("uk")) return ["ґ", "є", "і", "ї", "Ґ", "Є", "І", "Ї"];
    if (lang.startsWith("ru")) return ["ё", "Ё", "ъ", "Ъ", "ы", "Ы"];
    if (lang.startsWith("ar"))
      return ["ء", "أ", "إ", "آ", "ى", "ة", "ؤ", "ئ", "‎ً", "‎ٌ", "‎ٍ"];
    return [];
  }
  const specialChars = getSpecialCharsForLanguage(learningLanguage?.code);

  // caret-aware insertion without overwriting selection
  const inputRefEl = inputRef;
  const handleInsertChar = (ch: string) => {
    const el = inputRefEl.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const insertionIndex =
      (el.selectionDirection === "backward" ? start : end) ?? end;
    try {
      el.setSelectionRange(
        insertionIndex,
        insertionIndex,
        el.selectionDirection || "none"
      );
    } catch {}
    if (typeof el.setRangeText === "function") {
      el.setRangeText(ch, insertionIndex, insertionIndex, "end");
      setUserInput(el.value);
      const caretPos = insertionIndex + ch.length;
      lastSelectionRef.current = { start: caretPos, end: caretPos };
      setTimeout(() => {
        el.focus();
        try {
          el.setSelectionRange(caretPos, caretPos);
        } catch {}
      }, 0);
    } else {
      const value = el.value;
      const newValue =
        value.slice(0, insertionIndex) + ch + value.slice(insertionIndex);
      setUserInput(newValue);
      const caretPos = insertionIndex + ch.length;
      lastSelectionRef.current = { start: caretPos, end: caretPos };
      setTimeout(() => {
        el.focus();
        try {
          el.setSelectionRange(caretPos, caretPos);
        } catch {}
      }, 0);
    }
  };

  // warm-up TTS
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const utter = new window.SpeechSynthesisUtterance(" .");
      utter.lang = learningLanguage?.code || "de-DE";
      utter.volume = 0;
      window.speechSynthesis.speak(utter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reset when phrases change
  useEffect(() => {
    setCurrentIdx(0);
    setTargetPos(0);
    setUserInput("");
    setInputStatus("default");
    setCompleted(false);
    setHintLevel(0);
    setShowFixHint(false);
    if (fixHintTimeoutRef.current) {
      window.clearTimeout(fixHintTimeoutRef.current);
      fixHintTimeoutRef.current = null;
    }
  }, [phrases]);

  // reset when moving to next phrase or next target within phrase
  useEffect(() => {
    setUserInput("");
    setInputStatus("default");
    setHintLevel(0);
    setShowFixHint(false);
    if (fixHintTimeoutRef.current) {
      window.clearTimeout(fixHintTimeoutRef.current);
      fixHintTimeoutRef.current = null;
    }
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [currentIdx, targetPos]);

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
            setTargetPos(0);
            setUserInput("");
            setCompleted(false);
            setHintLevel(0);
            setShowFixHint(false);
            if (onComplete) onComplete();
          }}
          className="mt-2 py-3 px-8 rounded-2xl bg-blue-500 text-white text-lg font-semibold shadow hover:bg-blue-600 transition"
        >
          {t("proceed_to_next_block")}
        </button>
      </div>
    );

  // current phrase and targets
  const obj = phrases[currentIdx];
  const targetIndices = normalizeTargetIndices(obj.writing_exercise);
  const currentTargetIndex =
    targetIndices[Math.min(targetPos, targetIndices.length - 1)];

  const phraseWords = obj.phrase.split(/\s+/);
  const targetWord = getWordByIndex(obj.phrase, currentTargetIndex);
  const targetNorm = normalizeText(targetWord);

  // Build masked phrase:
  // - solved targets (index < targetPos): reveal word
  // - current target (index === targetPos): show masked/hinted
  // - future targets: full mask
  const maskedPhrase = phraseWords
    .map((w, i) => {
      const idx1 = i + 1;
      const posInTargets = targetIndices.indexOf(idx1);
      if (posInTargets === -1) return w; // not a target

      if (posInTargets < targetPos) {
        return getWordByIndex(obj.phrase, idx1); // already solved
      }
      if (posInTargets === targetPos) {
        if (hintLevel === 2) return getWordByIndex(obj.phrase, idx1);
        const realWord = getWordByIndex(obj.phrase, idx1);
        if (hintLevel === 1) {
          const prefix = getHint(realWord);
          return prefix + maskWord(realWord).slice(prefix.length);
        }
        return maskWord(realWord);
      }
      // future target
      const realWord = getWordByIndex(obj.phrase, idx1);
      return maskWord(realWord);
    })
    .join(" ");

  // per-keystroke verification against current target
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
    const userNorm = normalizeText(userInput);
    if (targetNorm.startsWith(userNorm)) {
      setInputStatus("default");
      setShowFixHint(false);
      if (userNorm === targetNorm && userNorm.length === targetNorm.length) {
        // Correct current target
        setInputStatus("correct");
        // If this was the last target for this phrase — move to next phrase
        const isLastTarget = targetPos >= targetIndices.length - 1;
        if (isLastTarget) {
          speakSmart(obj.phrase, { lang: learningLanguage?.code || "de-DE" });
          if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
          }
          feedbackTimeoutRef.current = window.setTimeout(() => {
            if (currentIdx < phrases.length - 1) {
              setCurrentIdx((idx) => idx + 1);
              setTargetPos(0);
              setUserInput("");
              setHintLevel(0);
              setInputStatus("default");
            } else {
              setCompleted(true);
              if (onComplete) onComplete();
            }
          }, WRITING_NEXT_DELAY_MS);
        } else {
          // Move to next target within the same phrase
          if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
          }
          feedbackTimeoutRef.current = window.setTimeout(() => {
            setTargetPos((p) => p + 1);
            setUserInput("");
            setHintLevel(0);
            setInputStatus("default");
          }, 400);
        }
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
    targetNorm,
    currentIdx,
    targetPos,
    targetIndices.length,
    phrases.length,
    onComplete,
    obj.phrase,
    learningLanguage,
  ]);

  const handleHintPart = () => {
    if (hintLevel < 1) setHintLevel(1);
  };
  const handleHintAll = () => {
    setHintLevel(2);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (normalizeText(userInput) === targetNorm) {
        setInputStatus("correct");
        setHintLevel(0);
        const isLastTarget = targetPos >= targetIndices.length - 1;
        if (isLastTarget) {
          speakSmart(obj.phrase, { lang: learningLanguage?.code || "de-DE" });
          if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
          }
          feedbackTimeoutRef.current = window.setTimeout(() => {
            if (currentIdx < phrases.length - 1) {
              setCurrentIdx((idx) => idx + 1);
              setTargetPos(0);
              setUserInput("");
              setHintLevel(0);
              setInputStatus("default");
            } else {
              setCompleted(true);
              if (onComplete) onComplete();
            }
          }, WRITING_NEXT_DELAY_MS);
        } else {
          if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
          }
          feedbackTimeoutRef.current = window.setTimeout(() => {
            setTargetPos((p) => p + 1);
            setUserInput("");
            setHintLevel(0);
            setInputStatus("default");
          }, 200);
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
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
    try {
      const el = e.target as HTMLInputElement;
      lastSelectionRef.current = {
        start: el.selectionStart ?? el.value.length,
        end: el.selectionEnd ?? el.value.length,
      };
    } catch {}
    if (
      inputStatus === "wrong" &&
      targetNorm.startsWith(normalizeText(e.target.value))
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
          placeholder={t("enter_word")}
          autoCapitalize="off"
        />
        {specialChars.length > 0 && (
          <div className="grid grid-cols-7 gap-1 w-full justify-items-center mt-3">
            {specialChars.map((ch) => (
              <button
                key={ch}
                type="button"
                aria-label={`Insert ${ch}`}
                className="min-w-[40px] h-10 px-2 py-2 rounded-xl border bg-gray-100 hover:bg-blue-100 text-base md:text-lg font-semibold text-blue-900 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 select-none"
                onClick={() => handleInsertChar(ch)}
              >
                {ch}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-row gap-3 w-full justify-center mt-5">
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
        {t("phrases_count", {
          current: currentIdx + 1,
          total: phrases.length,
        })}
      </div>
    </div>
  );
}
