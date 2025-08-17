import React, { useState, useRef, useEffect } from "react";
import { speakSmart } from "../utils/ttsUtils";
import { useAppContext } from "../AppContext";
import { Phrase } from "./MatchingExercise";

function tokenize(phrase: string): string[] {
  // Розбиває фразу на токени, пунктуація прилипає до слова
  return phrase.match(/[\w’'-]+[.,!?]?|[.,!?]/g) || [];
}

function stableShuffle<T>(arr: T[], seed: number): T[] {
  // Фішер-Йетс з seed
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function normalize(str: string): string {
  // Нормалізація: пробіли, апострофи, регістр
  return str
    .replace(/[\u2019\u2018']/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

interface MakePhraseProps {
  phraseObj: Phrase;
  distractors?: string[]; // опціонально, якщо хочеш передати свої
  onComplete: (result: {
    id: number;
    result: "success" | "skipped" | "error";
  }) => void;
  langCode?: string;
}

const MAX_HINTS = 2;

export default function MakePhrase({
  phraseObj,
  distractors,
  onComplete,
  langCode,
}: MakePhraseProps) {
  const { phrase, id, options } = phraseObj;
  const { interfaceLanguage } = useAppContext();
  const [tokens] = useState(() => tokenize(phrase));
  const [allTokens, setAllTokens] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [errorIdxs, setErrorIdxs] = useState<number[]>([]);
  const [hintStep, setHintStep] = useState(0);
  const [lockedIdxs, setLockedIdxs] = useState<number[]>([]);
  const [hiddenIdxs, setHiddenIdxs] = useState<number[]>([]);
  const [checking, setChecking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Генеруємо відволікаючі токени
  useEffect(() => {
    let distract = distractors || [];
    if (!distract.length && options) {
      distract = options.filter(
        (w) => !tokens.includes(w) && /^[\w’'-]+$/.test(w)
      );
    }
    // Вибираємо 2–4 відволікалки
    const extra = distract.slice(0, Math.min(4, distract.length));
    const mixed = stableShuffle([...tokens, ...extra], id || 1);
    setAllTokens(mixed);
    setSelected([]);
    setErrorIdxs([]);
    setHintStep(0);
    setLockedIdxs([]);
    setHiddenIdxs([]);
    setChecking(false);
    setSpeaking(false);
  }, [phrase, id, distractors, options, tokens]);

  // Клавіатурна навігація
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        dropZoneRef.current?.contains(document.activeElement)
      ) {
        if (e.key === "Backspace" || e.key === "Delete") {
          setSelected((sel) => sel.slice(0, -1));
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Перевірка
  const handleCheck = () => {
    setChecking(true);
    const normTarget = normalize(tokens.join(" "));
    const normUser = normalize(selected.join(" "));
    if (normTarget === normUser) {
      setErrorIdxs([]);
      setTimeout(() => {
        setSpeaking(true);
        speakSmart(phrase, {
          lang: langCode || interfaceLanguage?.code || "de-DE",
          onEnd: () => {
            setSpeaking(false);
            onComplete({ id: id ?? -1, result: "success" });
          },
        });
      }, 300);
    } else {
      // Показати помилки
      const errors: number[] = [];
      tokens.forEach((tok, idx) => {
        if (normalize(selected[idx] || "") !== normalize(tok)) errors.push(idx);
      });
      setErrorIdxs(errors);
      if (hintStep >= MAX_HINTS) {
        onComplete({ id: id ?? -1, result: "skipped" });
      }
    }
  };

  // Додати токен
  const handleSelectToken = (token: string, idx: number) => {
    if (lockedIdxs.includes(idx) || hiddenIdxs.includes(idx)) return;
    setSelected((sel) => [...sel, token]);
  };

  // Прибрати токен з drop-зони
  const handleRemoveToken = (idx: number) => {
    setSelected((sel) => sel.filter((_, i) => i !== idx));
  };

  // Очистити
  const handleClear = () => {
    setSelected([]);
    setErrorIdxs([]);
    setHintStep(0);
    setLockedIdxs([]);
    setHiddenIdxs([]);
    setChecking(false);
  };

  // Підказка 1: підсвітити перший правильний токен, що ще не вибрано
  const handleHint1 = () => {
    if (hintStep >= MAX_HINTS) return;
    const nextIdx = selected.length;
    setErrorIdxs([]);
    setLockedIdxs([nextIdx]);
    setHintStep((h) => h + 1);
  };

  // Підказка 2: заблокувати/приховати 1–2 хибні токени
  const handleHint2 = () => {
    if (hintStep >= MAX_HINTS) return;
    const wrongs: number[] = [];
    allTokens.forEach((tok, idx) => {
      if (!tokens.includes(tok) && !selected.includes(tok)) wrongs.push(idx);
    });
    setHiddenIdxs(wrongs.slice(0, 2));
    setHintStep((h) => h + 1);
  };

  // UI
  return (
    <div className="make-phrase-block p-4 max-w-xl mx-auto bg-white rounded-xl shadow flex flex-col items-center">
      <div className="mb-4 text-lg font-bold text-blue-700 text-center">
        {phraseObj.translation}
      </div>
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {allTokens.map((tok, idx) => (
          <button
            key={idx}
            disabled={
              selected.includes(tok) ||
              lockedIdxs.includes(idx) ||
              hiddenIdxs.includes(idx)
            }
            tabIndex={0}
            className={`px-3 py-2 rounded bg-blue-100 font-semibold shadow border border-blue-300 transition
              ${lockedIdxs.includes(idx) ? "ring-2 ring-green-400" : ""}
              ${hiddenIdxs.includes(idx) ? "opacity-0 pointer-events-none" : ""}
            `}
            onClick={() => handleSelectToken(tok, idx)}
          >
            {tok}
          </button>
        ))}
      </div>
      <div
        ref={dropZoneRef}
        className="drop-zone flex flex-wrap gap-2 min-h-[48px] bg-gray-50 rounded p-2 mb-4 border border-gray-200"
        tabIndex={0}
      >
        {selected.map((tok, idx) => (
          <span
            key={idx}
            className={`px-3 py-2 rounded bg-blue-200 font-semibold shadow border border-blue-400 cursor-pointer
              ${
                errorIdxs.includes(idx)
                  ? "bg-red-200 border-red-500 text-red-700"
                  : ""
              }
            `}
            tabIndex={0}
            onClick={() => handleRemoveToken(idx)}
          >
            {tok}
          </span>
        ))}
      </div>
      <div className="flex gap-3 mb-2">
        <button
          className="px-4 py-2 rounded bg-green-500 text-white font-bold"
          onClick={handleCheck}
          disabled={speaking}
        >
          Перевірити
        </button>
        <button
          className="px-4 py-2 rounded bg-yellow-400 text-white font-bold"
          onClick={hintStep === 0 ? handleHint1 : handleHint2}
          disabled={hintStep >= MAX_HINTS}
        >
          Підказка
        </button>
        <button
          className="px-4 py-2 rounded bg-gray-300 text-gray-800 font-bold"
          onClick={handleClear}
        >
          Очистити
        </button>
      </div>
      {checking && errorIdxs.length > 0 && (
        <div className="text-red-600 font-semibold mb-2">
          Помилка у позиціях: {errorIdxs.map((i) => i + 1).join(", ")}
        </div>
      )}
      {speaking && (
        <div className="text-blue-600 font-semibold mt-2">Озвучення…</div>
      )}
    </div>
  );
}
