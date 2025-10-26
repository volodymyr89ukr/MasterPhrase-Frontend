import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { speakSmart, speakSmartAsync, cancelSpeak } from "../utils/ttsUtils";
import { useTranslation } from "react-i18next";
import { Eraser, Lightbulb } from "lucide-react";
import { Button } from "./ui/Button";

// Reuse the shape used in MatchingExercise
export interface Phrase {
  id?: number;
  phrase: string;
  translation?: string;
  options?: string[];
}

interface MakePhraseResult {
  id: number | undefined;
  result: "done" | "skipped";
}

interface MakePhraseProps {
  question: Phrase;
  onComplete: (res: MakePhraseResult) => void;
}

// ── Timing: пауза після коректного складання (озвучення стартує одразу)
const NEXT_SET_DELAY_MS = 3000; // підібрано під середню фразу ~7 слів і темп 0.85

// Stable seeded RNG (mulberry32)
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number) {
  const rnd = mulberry32(seed || 1);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Tokenize: keep punctuation attached to the word (split by spaces)
function tokenizeWithPunctuation(s: string): string[] {
  return s.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
}

function normalizeStr(s: string): string {
  return s
    .replace(/['`´']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function compareTokens(a: string[], b: string[]): boolean {
  return normalizeStr(a.join(" ")) === normalizeStr(b.join(" "));
}

// ...existing code...
function pickDistractors(
  options: string[] | undefined,
  targetTokens: string[],
  count: number
): string[] {
  if (!options || options.length === 0 || count === 0) return [];
  const targetSet = new Set(targetTokens.map((t) => t.toLowerCase()));
  const words = new Set<string>();
  for (const opt of options) {
    for (const w of opt.split(/\s+/)) {
      const token = w.trim();
      if (!token) continue;
      // simple heuristic: looks like a word
      if (/^[\p{L}A-Za-zÄÖÜäöüßẞ]+[.,!?]*$/u.test(token)) {
        const low = token.toLowerCase();
        if (!targetSet.has(low)) words.add(token);
      }
    }
  }
  return Array.from(words).slice(0, count);
}
// ...existing code...

const MakePhrase: React.FC<MakePhraseProps> = ({ question, onComplete }) => {
  const { t } = useTranslation();
  const { learningLanguage } = useSettings();
  const [hintCount, setHintCount] = useState(0);
  const [disabledDistractors, setDisabledDistractors] = useState<Set<number>>(
    new Set()
  );
  const [errorIndices, setErrorIndices] = useState<number[]>([]);
  const [focusedDropIdx, setFocusedDropIdx] = useState<number | null>(null);
  const [isSuccessPause, setIsSuccessPause] = useState(false);
  const pauseTimerRef = useRef<number | null>(null);

  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  const correctTokens = useMemo(
    () => tokenizeWithPunctuation(question.phrase),
    [question.phrase]
  );
  const distractors = useMemo(() => {
    const phraseLength = correctTokens.length;
    let distractorCount = 0;

    if (phraseLength <= 7) {
      distractorCount = 3;
    } else if (phraseLength === 8) {
      distractorCount = 2;
    } else if (phraseLength === 9) {
      distractorCount = 1;
    }
    // Якщо phraseLength > 9, distractorCount залишається 0

    return pickDistractors(question.options, correctTokens, distractorCount);
  }, [question.options, correctTokens]);

  // Build and shuffle tokens with stable seed
  const allTokens = useMemo(() => {
    const combined = [...correctTokens, ...distractors];
    const seed =
      (question.id ?? 1) + correctTokens.length * 31 + distractors.length * 17;
    return seededShuffle(combined, seed);
  }, [correctTokens, distractors, question.id]);

  const [available, setAvailable] = useState<
    { token: string; used: boolean }[]
  >(allTokens.map((t) => ({ token: t, used: false })));
  const [selected, setSelected] = useState<string[]>([]);

  // Reset when question changes
  useEffect(() => {
    setHintCount(0);
    setDisabledDistractors(new Set());
    setErrorIndices([]);
    setFocusedDropIdx(null);
    setAvailable(allTokens.map((t) => ({ token: t, used: false })));
    setSelected([]);
    setIsSuccessPause(false);
    if (pauseTimerRef.current) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, [allTokens]);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        window.clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      cancelSpeak();
    };
  }, []);

  const langCode = learningLanguage?.code || "de-DE";

  const interactionsLocked = isSuccessPause;

  function handlePick(idx: number) {
    if (interactionsLocked) return;
    const item = available[idx];
    if (!item || item.used) return;
    if (disabledDistractors.has(idx)) return;
    setAvailable((arr) =>
      arr.map((o, i) => (i === idx ? { ...o, used: true } : o))
    );
    setSelected((arr) => [...arr, item.token]);
    setErrorIndices([]);
  }

  function handleRemove(dropIdx: number) {
    if (interactionsLocked) return;
    const tok = selected[dropIdx];
    if (!tok) return;
    setAvailable((arr) => {
      const i = arr.findIndex((a) => a.token === tok && a.used);
      if (i >= 0)
        arr = arr.map((o, idx) => (idx === i ? { ...o, used: false } : o));
      return arr;
    });
    setSelected((arr) => arr.filter((_, i) => i !== dropIdx));
    setFocusedDropIdx(null);
    setErrorIndices([]);
  }

  function handleClear() {
    if (interactionsLocked) return;
    setAvailable((arr) => arr.map((o) => ({ ...o, used: false })));
    setSelected([]);
    setErrorIndices([]);
    setFocusedDropIdx(null);
  }

  async function handleCheck() {
    if (interactionsLocked) return;

    const errs: number[] = [];
    for (let i = 0; i < selected.length || i < correctTokens.length; i++) {
      if (
        normalizeStr(selected[i] || "") !== normalizeStr(correctTokens[i] || "")
      ) {
        errs.push(i);
      }
    }
    setErrorIndices(errs);

    const ok = compareTokens(selected, correctTokens);
    if (ok) {
      setIsSuccessPause(true);

      try {
        await speakSmartAsync(question.phrase, { lang: langCode });
      } catch {
        // ignore TTS errors
      }

      await new Promise((r) => setTimeout(r, 800));

      setIsSuccessPause(false);
      onComplete({ id: question.id, result: "done" });
      return;
    }
  }

  function handleHint() {
    if (interactionsLocked) return;

    if (hintCount === 0) {
      setHintCount(1);
    } else if (hintCount === 1) {
      const toDisable = new Set<number>(disabledDistractors);
      for (let i = 0; i < available.length && toDisable.size < 2; i++) {
        const a = available[i];
        const inTarget = correctTokens.some(
          (ct) => normalizeStr(ct) === normalizeStr(a.token)
        );
        if (!inTarget && !a.used) toDisable.add(i);
      }
      setDisabledDistractors(toDisable);
      setHintCount(2);
    } else {
      onComplete({ id: question.id, result: "skipped" });
    }
  }

  function onDropZoneKeyDown(e: React.KeyboardEvent) {
    if (interactionsLocked) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      if (focusedDropIdx !== null) {
        handleRemove(focusedDropIdx);
      } else if (selected.length > 0) {
        handleRemove(selected.length - 1);
      }
    }
  }

  const nextCorrectIdx = useMemo(() => {
    if (hintCount < 1) return -1;
    return selected.length < correctTokens.length ? selected.length : -1;
  }, [hintCount, selected.length, correctTokens.length]);

  return (
    <div className="w-full h-full bg-background flex flex-col overflow-hidden">
      <div className="flex-shrink-0 max-w-xl w-full mx-auto px-4 pt-4">
        {/* Фіксований переклад */}
        {question.translation && (
          <div className="text-center text-muted-foreground italic mb-3 min-h-[1.6em]">
            {question.translation}
          </div>
        )}

        {/* Фіксована зона складання */}
        <div
          ref={dropZoneRef}
          className={[
            "p-3 mb-3 rounded-xl border flex flex-wrap gap-2 items-start transition-colors",
            isSuccessPause
              ? "bg-success/10 border-success animate-pulse"
              : "bg-card shadow border-border",
            "min-h-[6.4em] sm:min-h-[7.3em]",
          ].join(" ")}
          tabIndex={0}
          onKeyDown={onDropZoneKeyDown}
          aria-live="polite"
        >
          {selected.length === 0 && !isSuccessPause && (
            <span className="text-muted-foreground">
              {t("assemble_phrase_prompt", "Tap words to build the phrase")}
            </span>
          )}

          {isSuccessPause ? (
            <span className="text-success font-semibold">
              {normalizeStr(selected.join(" "))}
            </span>
          ) : (
            selected.map((tok, idx) => (
              <button
                key={idx}
                tabIndex={0}
                onFocus={() => setFocusedDropIdx(idx)}
                onBlur={() => setFocusedDropIdx((v) => (v === idx ? null : v))}
                onClick={() => handleRemove(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRemove(idx);
                  }
                }}
                disabled={interactionsLocked}
                className={`px-3 py-1 rounded-lg border shadow-sm bg-card text-card-foreground font-semibold hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors ${
                  errorIndices.includes(idx)
                    ? "border-destructive bg-destructive/10"
                    : "border-border"
                }`}
                title={t("remove_token", "Remove token")}
              >
                {tok}
              </button>
            ))
          )}
        </div>
      </div>

      {/* === SCROLLABLE AREA з варіантами слів === */}
      <div className="flex-1 overflow-y-auto scroll-mask-bottom min-h-0">
        <div className="max-w-xl w-full mx-auto px-4 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {available.map((a, i) => {
              const isCorrectHint =
                nextCorrectIdx >= 0 &&
                normalizeStr(a.token) ===
                  normalizeStr(correctTokens[nextCorrectIdx] || "") &&
                !a.used;
              const disabled =
                a.used || disabledDistractors.has(i) || interactionsLocked;
              return (
                <button
                  key={`${a.token}_${i}`}
                  disabled={disabled}
                  onClick={() => handlePick(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handlePick(i);
                    }
                  }}
                  className={`px-3 py-3 rounded-xl border shadow-sm text-center transition-transform select-none focus-ring min-h-[48px]
                ${
                  disabled
                    ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60"
                    : "bg-card hover:bg-accent text-card-foreground border-border active:scale-[0.97]"
                } ${isCorrectHint ? "ring-2 ring-success" : ""}`}
                  title={
                    disabled
                      ? t("token_disabled", "Token disabled")
                      : t("add_token", "Add token")
                  }
                >
                  {a.token}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* === BOTTOM FIXED CONTROLS === */}
      <div className="flex-shrink-0 bg-background/80 backdrop-blur-sm border-t pb-safe">
        <div className="max-w-xl mx-auto p-3 flex w-full items-center gap-2">
          {/* Другорядна кнопка "Очистити" */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("clear", "Clear")}
            onClick={handleClear}
            disabled={interactionsLocked || selected.length === 0}
          >
            <Eraser size={22} />
          </Button>
          {/* Другорядна кнопка "Підказка" */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={hintCount < 2 ? t("hint", "Hint") : t("skip", "Skip")}
            onClick={handleHint}
            disabled={interactionsLocked}
          >
            <Lightbulb size={22} />
          </Button>

          {/* Головна кнопка "Перевірити" */}
          <Button
            onClick={handleCheck}
            disabled={interactionsLocked || selected.length === 0}
            className="flex-1 h-12 text-base"
          >
            {t("check", "Check")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MakePhrase;
