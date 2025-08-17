import React, { useState, useEffect } from "react";
import MatchingExercise, { Phrase as Question } from "./MatchingExercise";
import MatchingPairsExercise from "./MatchingPairsExercise";
import MakePhrase from "./MakePhrase";
import PronunciationBlock from "./PronunciationBlock";
import WritingExercise from "./WritingExercise";
import { useTranslation } from "react-i18next";

export interface Phrase extends Question {
  id: number;
  writing_exercise?: string | number;
  [key: string]: any;
}

interface ExerciseSwitcherProps {
  exerciseData?: Phrase[];
  onBack?: () => void;
  title?: string;
}

// Centralized transition delay between exercise blocks (ms)
const TRANSITION_DELAY_MS = 5000;

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
    | "transition"
    | "make-phrase"
    | "pairs"
    | "pronunciation"
    | "writing"
    | "writing-finish"
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
      pool = deduplicatePhrases([{ ...currQ }, ...pool]).slice(0, 6);
      updatedQuestions.splice(currentIdx, 1);

      if (updatedQuestions.length === 0) {
        setQuestions(updatedQuestions);
        setMatchingPool(pool);
        // run MakePhrase phase over the pool before pairs
        setMakePhraseIdx(0);
        setMode("transition");
        setTimeout(() => setMode("make-phrase"), TRANSITION_DELAY_MS);
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

    if (pool.length >= 6) {
      // Start MakePhrase phase when we have a full pool
      setMakePhraseIdx(0);
      setMode("transition");
      setTimeout(() => setMode("make-phrase"), TRANSITION_DELAY_MS);
      return;
    }
  }

  function handlePairsComplete() {
    // small delay for smooth transition
    setMode("transition");
    setTimeout(() => setMode("pronunciation"), TRANSITION_DELAY_MS);
  }

  function handlePronunciationComplete() {
    setMode("transition");
    setTimeout(() => setMode("writing"), TRANSITION_DELAY_MS);
  }

  function handleWritingComplete() {
    setMatchingPool([]);
    if (questions.length === 0) {
      setFullyCompleted(true);
      setMode("finished");
      return;
    }
    // Показати модальне вікно про успіх перед поверненням до matching
    setMode("writing-finish");
    // Повернення до matching буде після натискання кнопки або таймера (див. нижче)
  }

  function handleFullReset() {
    setQuestions(prepareQuestions(exerciseData));
    setCurrentIdx(0);
    setMatchingPool([]);
    setMode("matching");
    setPairsKey((k) => k + 1);
    setFullyCompleted(false);
  }

  // Додаємо обробку переходу з writing-finish до matching
  useEffect(() => {
    if (mode === "writing-finish") {
      const timer = setTimeout(() => {
        setQuestions((qArr) => shuffleArray(qArr));
        setCurrentIdx(0);
        setMode("matching");
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [mode]);

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

  if (mode === "transition") {
    return (
      <div className="fullscreen-fix flex flex-col items-center justify-center bg-blue-50">
        <div className="max-w-lg w-full p-8 rounded-xl shadow bg-white text-center">
          <div className="text-3xl mb-4 text-green-600">✔️</div>
          <div className="text-xl font-bold mb-2">
            {t("great_find_phrases")}
          </div>
        </div>
      </div>
    );
  }

  // Модальне вікно після WritingExercise
  if (mode === "writing-finish") {
    return (
      <div className="fullscreen-fix flex flex-col items-center justify-center bg-blue-50">
        <div className="max-w-lg w-full p-8 rounded-xl shadow bg-white text-center">
          <div className="text-3xl mb-4 text-green-600">✔️</div>
          <div className="text-xl font-bold mb-2">
            {t("great_match_right_answer")}
          </div>
          <button
            className="mt-6 py-2 px-8 rounded-xl bg-blue-500 text-white font-semibold shadow hover:bg-blue-600 transition"
            onClick={() => {
              setQuestions((qArr) => shuffleArray(qArr));
              setCurrentIdx(0);
              setMode("matching");
            }}
          >
            {t("next")}
          </button>
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
                // proceed to pairs
                setMode("transition");
                setTimeout(() => {
                  setMode("pairs");
                  setPairsKey((k) => k + 1);
                }, TRANSITION_DELAY_MS);
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
            phrases={matchingPool.map((obj) => ({
              ...obj,
              wordIndexToWrite: Number(obj.writing_exercise),
            }))}
            onComplete={handleWritingComplete}
          />
        )}
      </div>
    </div>
  );
};

export default ExerciseSwitcher;
