import React, { useState, useRef, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { speakSmartAsync, cancelSpeak } from "../utils/ttsUtils";
import { useTranslation } from "react-i18next";
import {
  useInputEngine,
  useTouchDetection,
  useVisualViewportInset,
  CustomKeyboard,
  KeyboardSheet,
  deLayout,
  enLayout,
  esLayout,
  symbolsLayout,
  KeySpec,
  DensityTier,
} from "../modules/keyboard";

interface Phrase {
  phrase: string;
  translation?: string;
  writing_exercise?: number | string | Array<number | string>;
  wordIndexToWrite?: number;
  [key: string]: any;
}

interface WritingExerciseProps {
  phrases: Phrase[];
  onComplete?: () => void;
  onProgressUpdate?: (current: number, total: number) => void;
}

function getWordByIndex(str: string, idx: number): string {
  const words = str.split(/\s+/);
  if (idx < 1 || idx > words.length) return "";
  return words[idx - 1].replace(/[.,?!;:"""]/g, "");
}

function maskWord(word: string): string {
  return "_".repeat(Math.max(word.length, 8));
}

function getHint(word: string): string {
  if (word.length <= 2) return word[0] || "";
  if (word.length <= 4) return word.slice(0, 2);
  return word.slice(0, 3);
}

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
  onProgressUpdate,
}: WritingExerciseProps) {
  const { t } = useTranslation();
  const { learningLanguage } = useSettings();
  const { isTouchDevice } = useTouchDetection();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [targetPos, setTargetPos] = useState(0);
  const [inputStatus, setInputStatus] = useState<
    "default" | "wrong" | "correct"
  >("default");
  const [completed, setCompleted] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [showFixHint, setShowFixHint] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [keyboardDensity, setKeyboardDensity] =
    useState<DensityTier>("comfort");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const fixHintTimeoutRef = useRef<number | null>(null);

  // ✅ Keyboard Engine
  const engine = useInputEngine({
    initial: "",
    initialLayout:
      learningLanguage?.code === "de"
        ? "de"
        : learningLanguage?.code === "es"
        ? "es"
        : "en",
    onEnter: () => handleSubmit(),
  });

  // Sync engine.value → local verification
  const userInput = engine.value;

  // Get current layout
  const layouts = {
    en: enLayout,
    de: deLayout,
    es: esLayout,
  };
  const currentLayout = engine.symbols
    ? symbolsLayout
    : layouts[engine.layoutId];

  // TTS warm-up
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const utter = new window.SpeechSynthesisUtterance(" .");
      utter.lang = learningLanguage?.code || "de-DE";
      utter.volume = 0;
      window.speechSynthesis.speak(utter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Встановлюємо початковий прогрес
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate(currentIdx + 1, phrases.length);
    }
  }, [currentIdx, phrases.length, onProgressUpdate]);
  // Reset when phrases change
  useEffect(() => {
    setCurrentIdx(0);
    setTargetPos(0);
    engine.reset();
    setInputStatus("default");
    setCompleted(false);
    setHintLevel(0);
    setShowFixHint(false);
    if (fixHintTimeoutRef.current) {
      window.clearTimeout(fixHintTimeoutRef.current);
      fixHintTimeoutRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrases]);

  // Reset when moving to next phrase or next target
  useEffect(() => {
    engine.reset();
    setInputStatus("default");
    setHintLevel(0);
    setShowFixHint(false);
    if (fixHintTimeoutRef.current) {
      window.clearTimeout(fixHintTimeoutRef.current);
      fixHintTimeoutRef.current = null;
    }
    if (!isTouchDevice && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, targetPos, isTouchDevice]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
      if (fixHintTimeoutRef.current) {
        window.clearTimeout(fixHintTimeoutRef.current);
      }
      cancelSpeak();
    };
  }, []);

  if (!phrases.length)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="text-xl text-muted-foreground">
          {t("no_phrases_for_writing")}
        </div>
      </div>
    );

  if (completed)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="text-4xl mb-3">🎉</div>
        <div className="text-2xl font-bold mb-3">
          {t("writing_block_completed")}
        </div>
        <button
          onClick={() => {
            setCurrentIdx(0);
            setTargetPos(0);
            engine.reset();
            setCompleted(false);
            setHintLevel(0);
            setShowFixHint(false);
            if (onComplete) onComplete();
          }}
          className="mt-2 py-3 px-8 rounded-2xl bg-primary text-primary-foreground text-lg font-semibold shadow hover:bg-primary/90 transition-colors"
        >
          {t("proceed_to_next_block")}
        </button>
      </div>
    );

  // Current phrase and targets
  const obj = phrases[currentIdx];
  const targetIndices = normalizeTargetIndices(obj.writing_exercise);
  const currentTargetIndex =
    targetIndices[Math.min(targetPos, targetIndices.length - 1)];

  const phraseWords = obj.phrase.split(/\s+/);
  const targetWord = getWordByIndex(obj.phrase, currentTargetIndex);
  const targetNorm = normalizeText(targetWord);

  // Build masked phrase
  const maskedPhrase = phraseWords
    .map((w, i) => {
      const idx1 = i + 1;
      const posInTargets = targetIndices.indexOf(idx1);
      if (posInTargets === -1) return w;

      if (posInTargets < targetPos) {
        return getWordByIndex(obj.phrase, idx1);
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
      const realWord = getWordByIndex(obj.phrase, idx1);
      return maskWord(realWord);
    })
    .join(" ");

  // Per-keystroke verification
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
        setInputStatus("correct");
        const isLastTarget = targetPos >= targetIndices.length - 1;
        if (isLastTarget) {
          (async () => {
            try {
              await speakSmartAsync(obj.phrase, {
                lang: learningLanguage?.code || "de-DE",
              });
            } catch {}
            await new Promise((r) => setTimeout(r, 800));

            if (currentIdx < phrases.length - 1) {
              const nextIdx = currentIdx + 1;
              setCurrentIdx(nextIdx);
              setTargetPos(0);
              engine.reset();
              setHintLevel(0);
              setInputStatus("default");

              // Оновлюємо прогрес у батьківському компоненті
              if (onProgressUpdate) {
                onProgressUpdate(nextIdx + 1, phrases.length);
              }
            } else {
              // Встановлюємо прогрес на максимум перед завершенням
              if (onProgressUpdate) {
                onProgressUpdate(phrases.length, phrases.length);
              }

              setCompleted(true);
              if (onComplete) onComplete();
            }
          })();
        } else {
          if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
          }
          feedbackTimeoutRef.current = window.setTimeout(() => {
            setTargetPos((p) => p + 1);
            engine.reset();
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

  const handleSubmit = () => {
    if (normalizeText(userInput) === targetNorm) {
      setInputStatus("correct");
      setHintLevel(0);
      const isLastTarget = targetPos >= targetIndices.length - 1;
      if (isLastTarget) {
        (async () => {
          try {
            await speakSmartAsync(obj.phrase, {
              lang: learningLanguage?.code || "de-DE",
            });
          } catch {}
          await new Promise((r) => setTimeout(r, 800));

          if (currentIdx < phrases.length - 1) {
            const nextIdx = currentIdx + 1;
            setCurrentIdx(nextIdx);
            setTargetPos(0);
            engine.reset();
            setHintLevel(0);
            setInputStatus("default");

            // Оновлюємо прогрес у батьківському компоненті
            if (onProgressUpdate) {
              onProgressUpdate(nextIdx + 1, phrases.length);
            }
          } else {
            // Встановлюємо прогрес на максимум перед завершенням
            if (onProgressUpdate) {
              onProgressUpdate(phrases.length, phrases.length);
            }

            setCompleted(true);
            if (onComplete) onComplete();
          }
        })();
      } else {
        if (feedbackTimeoutRef.current) {
          window.clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = window.setTimeout(() => {
          setTargetPos((p) => p + 1);
          engine.reset();
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
  };

  const handleHintPart = () => {
    if (hintLevel < 1) setHintLevel(1);
  };

  const handleHintAll = () => {
    setHintLevel(2);
  };

  const handleKey = (spec: KeySpec) => {
    if (spec.type === "char") {
      engine.insert(spec.value || spec.label);
    } else {
      switch (spec.action) {
        case "Backspace":
          engine.backspace();
          break;
        case "Enter":
          handleSubmit();
          break;
        case "Space":
          engine.space();
          break;
        case "Shift":
          engine.toggleShift();
          break;
        case "Symbols":
          engine.setSymbols(!engine.symbols);
          break;
        case "Switch":
          setShowLangPicker((s) => !s);
          break;
      }
    }
  };

  const inputColorClass =
    inputStatus === "correct"
      ? "border-success bg-success/10"
      : inputStatus === "wrong"
      ? "border-destructive bg-destructive/10 animate-shake"
      : "border-input bg-card focus:border-ring";

  return (
    <div className="flex flex-col h-full w-full items-stretch p-0 m-0">
      <div className="p-4 max-w-lg w-full min-w-[320px] mx-auto rounded-xl shadow bg-card flex flex-col items-center">
        <div className="text-base sm:text-lg text-muted-foreground italic text-center min-h-[2em]">
          {obj.translation}
        </div>
        <div
          className="text-2xl sm:text-3xl text-center font-semibold min-h-[2.7em] px-2 sm:px-6 py-2"
          style={{ letterSpacing: "0.02em", wordBreak: "break-word" }}
        >
          {maskedPhrase}
        </div>

        {/* Desktop: normal input */}
        {!isTouchDevice ? (
          <input
            ref={inputRef}
            type="text"
            className={`text-xl sm:text-2xl text-center px-5 py-3 rounded-lg border-2 outline-none shadow transition-all duration-200 w-full max-w-[90vw] ${inputColorClass}`}
            style={{
              fontFamily: "inherit",
              letterSpacing: "0.04em",
            }}
            value={engine.value}
            onChange={(e) => {
              // Sync desktop input to engine
              const newVal = e.target.value;
              engine.reset();
              for (const ch of newVal) {
                engine.insert(ch);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            placeholder={t("enter_word")}
            autoCapitalize="off"
          />
        ) : (
          // Touch: non-focusable display
          <div
            role="textbox"
            aria-readonly="true"
            aria-live="polite"
            className={`text-xl sm:text-2xl text-center px-5 py-3 rounded-lg border-2 shadow transition-all duration-200 w-full max-w-[90vw] min-h-[52px] ${inputColorClass}`}
            style={{
              fontFamily: "inherit",
              letterSpacing: "0.04em",
            }}
          >
            {engine.value}
            <span className="animate-pulse ml-1">|</span>
          </div>
        )}

        <div className="flex flex-row gap-3 w-full justify-center mt-5">
          <button
            onClick={handleHintPart}
            disabled={hintLevel >= 1}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl border bg-secondary hover:bg-accent text-secondary-foreground text-base transition-colors ${
              hintLevel >= 1 ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {t("show_part_of_word")}
          </button>
          <button
            onClick={handleHintAll}
            disabled={hintLevel >= 2}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl border bg-secondary hover:bg-accent text-secondary-foreground text-base transition-colors ${
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

      {/* Touch: Custom Keyboard */}
      {isTouchDevice && (
        <KeyboardSheet onDensityChange={setKeyboardDensity}>
          <CustomKeyboard
            layout={currentLayout}
            shift={engine.shift}
            density={keyboardDensity}
            onKey={handleKey}
          />
        </KeyboardSheet>
      )}

      {/* Language Picker Modal */}
      {showLangPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card p-4 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold mb-3 text-foreground">
              {t("select_language")}
            </h3>
            <div className="flex gap-2">
              {(["en", "de", "es"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    engine.setLayout(lang);
                    setShowLangPicker(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    engine.layoutId === lang
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-accent text-secondary-foreground"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
