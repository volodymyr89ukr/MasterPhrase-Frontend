import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../AppContext";
import { speakSmart } from "../utils/ttsUtils";
import { useTranslation } from "react-i18next";

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
    .replace(/[’`´‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function compareTokens(a: string[], b: string[]): boolean {
  return normalizeStr(a.join(" ")) === normalizeStr(b.join(" "));
}

function pickDistractors(
  options: string[] | undefined,
  targetTokens: string[]
): string[] {
  if (!options || options.length === 0) return [];
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
  return Array.from(words).slice(0, 3); // 1-3 distractors
}

const MakePhrase: React.FC<MakePhraseProps> = ({ question, onComplete }) => {
  const { t } = useTranslation();
  const { learningLanguage } = useAppContext();
  const [hintCount, setHintCount] = useState(0);
  const [disabledDistractors, setDisabledDistractors] = useState<Set<number>>(
    new Set()
  );
  const [errorIndices, setErrorIndices] = useState<number[]>([]);
  const [focusedDropIdx, setFocusedDropIdx] = useState<number | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  const correctTokens = useMemo(
    () => tokenizeWithPunctuation(question.phrase),
    [question.phrase]
  );
  const distractors = useMemo(
    () => pickDistractors(question.options, correctTokens),
    [question.options, correctTokens]
  );

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
  }, [allTokens]);

  const langCode = learningLanguage?.code || "de-DE";

  function handlePick(idx: number) {
    const item = available[idx];
    if (!item || item.used) return;
    // if token disabled by hint2, ignore
    if (disabledDistractors.has(idx)) return;
    setAvailable((arr) =>
      arr.map((o, i) => (i === idx ? { ...o, used: true } : o))
    );
    setSelected((arr) => [...arr, item.token]);
    setErrorIndices([]);
  }

  function handleRemove(dropIdx: number) {
    const tok = selected[dropIdx];
    if (!tok) return;
    // free exactly one matching 'used' token from available (first matching and used)
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
    setAvailable((arr) => arr.map((o) => ({ ...o, used: false })));
    setSelected([]);
    setErrorIndices([]);
    setFocusedDropIdx(null);
  }

  function handleCheck() {
    // Validate selection vs correct tokens
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
      // speak and move on (let speech continue)
      speakSmart(question.phrase, { lang: langCode });
      // small smooth transition
      setTimeout(() => onComplete({ id: question.id, result: "done" }), 400);
    }
  }

  function handleHint() {
    if (hintCount === 0) {
      // Hint #1: highlight next correct token not yet chosen
      setHintCount(1);
    } else if (hintCount === 1) {
      // Hint #2: disable up to 2 distractors (not in correctTokens)
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
      // After two hints, show skip behavior
      onComplete({ id: question.id, result: "skipped" });
    }
  }

  // Keyboard handling for drop-zone (remove with Backspace/Delete)
  function onDropZoneKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      if (focusedDropIdx !== null) {
        handleRemove(focusedDropIdx);
      } else if (selected.length > 0) {
        handleRemove(selected.length - 1);
      }
    }
  }

  // Compute index to highlight for hint #1
  const nextCorrectIdx = useMemo(() => {
    if (hintCount < 1) return -1;
    return selected.length < correctTokens.length ? selected.length : -1;
  }, [hintCount, selected.length, correctTokens.length]);

  return (
    <div className="fullscreen-fix bg-blue-50 flex flex-col">
      <div className="max-w-xl w-full mx-auto p-4">
        {/* Title / Translation */}
        {question.translation && (
          <div className="text-center text-gray-600 italic mb-2 min-h-[1.6em]">
            {question.translation}
          </div>
        )}

        {/* Drop zone */}
        <div
          ref={dropZoneRef}
          className="min-h-[64px] p-3 mb-4 rounded-xl bg-white shadow border border-blue-100 flex flex-wrap gap-2 items-center"
          tabIndex={0}
          onKeyDown={onDropZoneKeyDown}
        >
          {selected.length === 0 && (
            <span className="text-gray-400">
              {t("assemble_phrase_prompt", "Tap words to build the phrase")}
            </span>
          )}
          {selected.map((tok, idx) => (
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
              className={`px-3 py-1 rounded-lg border shadow-sm bg-blue-50 text-blue-900 font-semibold hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                errorIndices.includes(idx)
                  ? "border-red-400 bg-red-50"
                  : "border-blue-100"
              }`}
              title={t("remove_token", "Remove token")}
            >
              {tok}
            </button>
          ))}
        </div>

        {/* Available tokens */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {available.map((a, i) => {
            const isCorrectHint =
              nextCorrectIdx >= 0 &&
              normalizeStr(a.token) ===
                normalizeStr(correctTokens[nextCorrectIdx] || "") &&
              !a.used;
            const disabled = a.used || disabledDistractors.has(i);
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
                className={`px-3 py-2 rounded-xl border shadow-sm text-center transition select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  disabled
                    ? "bg-gray-100 text-gray-400 border-gray-200"
                    : "bg-white hover:bg-blue-50 text-blue-900 border-blue-100"
                } ${isCorrectHint ? "ring-2 ring-green-400" : ""}`}
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

        {/* Controls */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleCheck}
            className="px-4 py-2 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 shadow"
          >
            {t("check", "Check")}
          </button>
          <button
            onClick={handleHint}
            className="px-4 py-2 rounded-xl bg-gray-100 text-blue-900 font-semibold hover:bg-blue-100 border border-blue-100 shadow"
          >
            {hintCount < 2 ? t("hint", "Hint") : t("skip", "Skip")}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-xl bg-gray-100 text-blue-900 font-semibold hover:bg-blue-100 border border-blue-100 shadow"
          >
            {t("clear", "Clear")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MakePhrase;
