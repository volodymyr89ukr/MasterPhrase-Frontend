import React, { useState, useEffect } from "react";
import MatchingExercise, { Phrase as Question } from "./MatchingExercise";
import MatchingPairsExercise from "./MatchingPairsExercise";
import MakePhrase from "./MakePhrase";
import PronunciationBlock from "./PronunciationBlock";
import WritingExercise from "./WritingExercise";
import { useTranslation } from "react-i18next";
import { cancelSpeak } from "../utils/ttsUtils";
import { useSettings } from "../contexts/SettingsContext";

export interface Phrase extends Question {
  id: number;
  // accept array or scalar (backward-compat)
  writing_exercise?: string | number | Array<string | number>;
  [key: string]: any;
}

interface ExerciseSwitcherProps {
  exerciseData?: Phrase[];
  onBack?: () => void;
  title?: string;
}

// Centralized transition delay between exercise blocks (ms)
const TRANSITION_DELAY_MS = 1500;

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function prepareQuestions(rawData: Phrase[]): Phrase[] {
  return rawData.map((q, idx) => ({
    ...q,
    id: idx,
  }));
}

function deduplicatePhrases(arr: Phrase[]): Phrase[] {
  const seen = new Set<number>();
  return arr.filter((obj) => {
    if (seen.has(obj.id)) return false;
    seen.add(obj.id);
    return true;
  });
}

const ExerciseSwitcher: React.FC<ExerciseSwitcherProps> = ({
  exerciseData = [],
  onBack,
  title,
}) => {
  const { t } = useTranslation();
  const { poolSize } = useSettings();

  if (!Array.isArray(exerciseData) || exerciseData.length === 0) {
    return (
      <div className="p-8 text-red-500 text-center">{t("data_not_found")}</div>
    );
  }

  const [questions, setQuestions] = useState<Phrase[]>(() =>
    prepareQuestions(exerciseData)
  );
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [matchingPool, setMatchingPool] = useState<Phrase[]>([]);
  const [mode, setMode] = useState<
    | "matching"
    | "transition-to-make-phrase"
    | "make-phrase"
    | "transition-to-pairs"
    | "pairs"
    | "transition-to-pronunciation"
    | "pronunciation"
    | "transition-to-writing"
    | "writing"
    | "transition-back-to-matching"
    | "finished"
  >("matching");
  const [pairsKey, setPairsKey] = useState<number>(1);
  const [fullyCompleted, setFullyCompleted] = useState<boolean>(false);
  const [makePhraseIdx, setMakePhraseIdx] = useState<number>(0);

  useEffect(() => {
    setQuestions(prepareQuestions(exerciseData));
    setCurrentIdx(0);
    setMatchingPool([]);
    setMode("matching");
    setPairsKey(1);
    setFullyCompleted(false);
    setMakePhraseIdx(0);
  }, [exerciseData]);

  useEffect(() => {
    cancelSpeak(); // при зміні режиму зупинити поточне TTS
  }, [mode]);
  // і в cleanup вже не треба manual window.speechSynthesis.cancel()
  // Автоматичний перехід із transition-екранів через 2500 мс
  useEffect(() => {
    let timer: number | undefined;

    if (mode === "transition-to-make-phrase") {
      timer = window.setTimeout(() => setMode("make-phrase"), 2500);
    } else if (mode === "transition-to-pairs") {
      timer = window.setTimeout(() => setMode("pairs"), 2500);
    } else if (mode === "transition-to-pronunciation") {
      timer = window.setTimeout(() => setMode("pronunciation"), 2500);
    } else if (mode === "transition-to-writing") {
      timer = window.setTimeout(() => setMode("writing"), 2500);
    } else if (mode === "transition-back-to-matching") {
      timer = window.setTimeout(() => {
        setQuestions((qArr) => shuffleArray(qArr));
        setCurrentIdx(0);
        setMode("matching");
      }, 2500);
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [mode]);

  function handleAnswer(option: string | null) {
    if (option === null) {
      // Optionally ignore or handle null option
      return;
    }
    const currQ = questions[currentIdx];
    let updatedQuestions = [...questions];
    let updatedIdx = currentIdx;

    const isCorrect = option === currQ.answer;
    let pool = [...matchingPool];

    if (isCorrect) {
      pool = deduplicatePhrases([{ ...currQ }, ...pool]).slice(0, poolSize);
      updatedQuestions.splice(currentIdx, 1);

      if (updatedQuestions.length === 0) {
        setQuestions(updatedQuestions);
        setMatchingPool(pool);
        setMakePhraseIdx(0);
        setMode("transition-to-make-phrase");
        return;
      }
      updatedIdx = Math.min(currentIdx, updatedQuestions.length - 1);
    } else {
      if (updatedQuestions.length > 5) {
        const wrongQ = updatedQuestions.splice(currentIdx, 1)[0];
        let insertPos = currentIdx + 3;
        if (insertPos > updatedQuestions.length)
          insertPos = updatedQuestions.length;
        updatedQuestions.splice(insertPos, 0, wrongQ);
        updatedIdx = currentIdx;
      } else {
        const wrongQ = updatedQuestions.splice(currentIdx, 1)[0];
        updatedQuestions.push(wrongQ);
        updatedIdx = currentIdx;
      }
    }

    setQuestions(updatedQuestions);
    setCurrentIdx(updatedIdx);
    setMatchingPool(pool);

    if (pool.length >= poolSize) {
      setMakePhraseIdx(0);
      setMode("transition-to-make-phrase");
      return;
    }
  }

  function handlePairsComplete() {
    setMode("transition-to-pronunciation");
  }

  function handlePronunciationComplete() {
    setMode("transition-to-writing");
  }

  function handleWritingComplete() {
    setMatchingPool([]);
    if (questions.length === 0) {
      setFullyCompleted(true);
      setMode("finished");
      return;
    }
    setMode("transition-back-to-matching");
  }

  function handleFullReset() {
    setQuestions(prepareQuestions(exerciseData));
    setCurrentIdx(0);
    setMatchingPool([]);
    setMode("matching");
    setPairsKey((k) => k + 1);
    setFullyCompleted(false);
  }

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  if (mode === "finished" || fullyCompleted) {
    return (
      <div className="fullscreen-fix flex flex-col items-center justify-center bg-blue-50">
        <div className="max-w-lg w-full p-6 rounded-xl shadow bg-white text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-4">
            {t("congratulations_finished")}
          </h2>
          <button
            className="mt-6 py-2 px-8 rounded-xl bg-green-500 text-white font-semibold shadow hover:bg-green-600 transition"
            onClick={handleFullReset}
          >
            {t("start_over")}
          </button>
          {onBack && (
            <button
              className="mt-3 ml-3 py-2 px-6 rounded-xl bg-gray-200 text-gray-800 font-semibold shadow hover:bg-gray-300 transition"
              onClick={onBack}
            >
              {t("back_to_exercise_selection")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Transition екрани
  if (mode === "transition-to-make-phrase") {
    return (
      <div className="fullscreen-fix flex flex-col items-center justify-center bg-blue-50">
        <div className="max-w-lg w-full p-8 rounded-xl shadow bg-white text-center">
          <div className="text-3xl mb-4 text-green-600">✔️</div>
          <div className="text-xl font-bold mb-2">
            {t("great_make_phrase", "Чудово! Тепер склади фрази зі слів.")}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "transition-to-pairs") {
    return (
      <div className="fullscreen-fix flex flex-col items-center justify-center bg-blue-50">
        <div className="max-w-lg w-full p-8 rounded-xl shadow bg-white text-center">
          <div className="text-3xl mb-4 text-green-600">✔️</div>
          <div className="text-xl font-bold mb-2">
            {t(
              "great_find_phrases",
              "Чудово! Тепер знайди фрази та їх переклади."
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "transition-to-pronunciation") {
    return (
      <div className="fullscreen-fix flex flex-col items-center justify-center bg-blue-50">
        <div className="max-w-lg w-full p-8 rounded-xl shadow bg-white text-center">
          <div className="text-3xl mb-4 text-green-600">✔️</div>
          <div className="text-xl font-bold mb-2">
            {t("great_pronunciation", "Відмінно! Тепер повтори фрази вголос.")}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "transition-to-writing") {
    return (
      <div className="fullscreen-fix flex flex-col items-center justify-center bg-blue-50">
        <div className="max-w-lg w-full p-8 rounded-xl shadow bg-white text-center">
          <div className="text-3xl mb-4 text-green-600">✔️</div>
          <div className="text-xl font-bold mb-2">
            {t("great_writing", "Супер! Тепер напиши слова з фраз.")}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "transition-back-to-matching") {
    return (
      <div className="fullscreen-fix flex flex-col items-center justify-center bg-blue-50">
        <div className="max-w-lg w-full p-8 rounded-xl shadow bg-white text-center">
          <div className="text-3xl mb-4 text-green-600">✔️</div>
          <div className="text-xl font-bold mb-2">
            {t(
              "great_match_right_answer",
              "Чудово! Тепер обери правильну відповідь."
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fullscreen-fix bg-blue-50 flex flex-col">
      {title && (
        <div className="text-center text-lg font-bold mt-2 mb-1 text-blue-700">
          {title}
        </div>
      )}
      {onBack && (
        <button
          className="self-start ml-3 mt-2 mb-2 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 transition"
          onClick={onBack}
        >
          {t("back")}
        </button>
      )}
      <div className="flex-1 flex items-center justify-center">
        {mode === "matching" && questions[currentIdx] && (
          <MatchingExercise
            question={questions[currentIdx]}
            pool={matchingPool}
            onAnswer={handleAnswer}
            progress={exerciseData.length - questions.length}
            total={exerciseData.length}
          />
        )}
        {mode === "make-phrase" && matchingPool.length >= 1 && (
          <MakePhrase
            key={`make-${makePhraseIdx}-${matchingPool.length}`}
            question={matchingPool[makePhraseIdx]}
            onComplete={() => {
              const nextIdx = makePhraseIdx + 1;
              if (nextIdx < matchingPool.length) {
                setMakePhraseIdx(nextIdx);
              } else {
                setMode("transition-to-pairs");
                setPairsKey((k) => k + 1);
              }
            }}
          />
        )}
        {mode === "pairs" && matchingPool.length >= 2 && (
          <MatchingPairsExercise
            key={pairsKey}
            phrases={matchingPool}
            onComplete={handlePairsComplete}
          />
        )}
        {mode === "pairs" && matchingPool.length < 2 && (
          <div className="fullscreen-fix flex flex-col items-center justify-center bg-blue-50">
            <div className="max-w-lg w-full p-6 rounded-xl shadow bg-white text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-4">
                {t("congratulations_finished")}
              </h2>
              <button
                className="mt-6 py-2 px-8 rounded-xl bg-green-500 text-white font-semibold shadow hover:bg-green-600 transition"
                onClick={handleFullReset}
              >
                {t("start_over")}
              </button>
              {onBack && (
                <button
                  className="mt-3 ml-3 py-2 px-6 rounded-xl bg-gray-200 text-gray-800 font-semibold shadow hover:bg-gray-300 transition"
                  onClick={onBack}
                >
                  {t("back_to_exercise_selection")}
                </button>
              )}
            </div>
          </div>
        )}

        {mode === "pronunciation" && matchingPool.length >= 1 && (
          <PronunciationBlock
            phrases={matchingPool}
            cycles={1}
            onComplete={handlePronunciationComplete}
          />
        )}

        {mode === "writing" && matchingPool.length >= 1 && (
          <WritingExercise
            key={matchingPool.map((obj) => obj.id).join("_")}
            phrases={matchingPool}
            onComplete={handleWritingComplete}
          />
        )}
      </div>
    </div>
  );
};

export default ExerciseSwitcher;
