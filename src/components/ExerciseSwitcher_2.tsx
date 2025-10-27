import React, { useState, useEffect } from "react";
import MatchingExercise, { Phrase as Question } from "./MatchingExercise";
import MatchingPairsExercise from "./MatchingPairsExercise";
import MakePhrase from "./MakePhrase";
import PronunciationBlock from "./PronunciationBlock";
import WritingExercise from "./WritingExercise";
import ExerciseProgressHeader from "./ExerciseProgressHeader";
import SessionProgressScreen from "./SessionProgressScreen";
import { useTranslation } from "react-i18next";
import { cancelSpeak } from "../utils/ttsUtils";
import { useSettings } from "../contexts/SettingsContext";
import { useProgress } from "../contexts/ProgressContext";
import { TransitionScreen } from "./ui/TransitionScreen";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

export interface Phrase extends Question {
  id: number;
  writing_exercise?: string | number | Array<string | number>;
  [key: string]: any;
}

interface ExerciseSwitcherProps {
  exerciseData?: Phrase[];
  onBack?: () => void;
  title?: string;
}

// Centralized transition delay between exercise blocks (ms)
const TRANSITION_DELAY_MS = 2500;

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
  const { knownWordIdsSet } = useProgress();

  if (!Array.isArray(exerciseData) || exerciseData.length === 0) {
    return (
      <div className="p-8 text-destructive text-center">
        {t("data_not_found")}
      </div>
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

  // Відстеження фраз, які пройшли всі 5 блоків
  const [cycleCompletedPhrases, setCycleCompletedPhrases] = useState<
    Set<number>
  >(new Set());

  // Лічильник для показу макро-прогресу
  const [showSessionProgress, setShowSessionProgress] = useState(false);
  // Прогрес для блоків pairs, pronunciation, writing
  const [pairsProgress, setPairsProgress] = useState(0);
  const [pronunciationProgress, setPronunciationProgress] = useState(0);
  const [writingProgress, setWritingProgress] = useState(0);
  // Отримати назву поточного блоку
  function getBlockName(currentMode: typeof mode): string {
    switch (currentMode) {
      case "matching":
        return t("block_matching", "Розпізнавання");
      case "make-phrase":
        return t("block_make_phrase", "Складання фраз");
      case "pairs":
        return t("block_pairs", "Пари");
      case "pronunciation":
        return t("block_pronunciation", "Вимова");
      case "writing":
        return t("block_writing", "Написання");
      default:
        return "";
    }
  }

  // Отримати номер поточного блоку (1-5)
  function getBlockNumber(currentMode: typeof mode): number {
    switch (currentMode) {
      case "matching":
        return 1;
      case "make-phrase":
        return 2;
      case "pairs":
        return 3;
      case "pronunciation":
        return 4;
      case "writing":
        return 5;
      default:
        return 0;
    }
  }

  // Отримати поточний прогрес у циклі (скільки завершено)
  function getCurrentInCycle(currentMode: typeof mode): number {
    switch (currentMode) {
      case "matching":
        // Прогрес у блоці "matching" - це кількість фраз,
        // які вже додані до поточного пулу (matchingPool)
        return matchingPool.length;
      case "make-phrase":
        // Скільки фраз вже завершено (не +1)
        return makePhraseIdx;
      case "pairs":
        return pairsProgress;
      case "pronunciation":
        return pronunciationProgress;
      case "writing":
        return writingProgress;
      default:
        return 0;
    }
  }

  useEffect(() => {
    setQuestions(prepareQuestions(exerciseData));
    setCurrentIdx(0);
    setMatchingPool([]);
    setMode("matching");
    setPairsKey(1);
    setFullyCompleted(false);
    setMakePhraseIdx(0);
    setCycleCompletedPhrases(new Set());
    setShowSessionProgress(false);
    setPairsProgress(0);
    setPronunciationProgress(0);
    setWritingProgress(0);
  }, [exerciseData]);

  useEffect(() => {
    cancelSpeak();
  }, [mode]);

  // Автоматичний перехід із transition-екранів
  useEffect(() => {
    let timer: number | undefined;

    if (mode === "transition-to-make-phrase") {
      timer = window.setTimeout(
        () => setMode("make-phrase"),
        TRANSITION_DELAY_MS
      );
    } else if (mode === "transition-to-pairs") {
      timer = window.setTimeout(() => setMode("pairs"), TRANSITION_DELAY_MS);
    } else if (mode === "transition-to-pronunciation") {
      timer = window.setTimeout(
        () => setMode("pronunciation"),
        TRANSITION_DELAY_MS
      );
    } else if (mode === "transition-to-writing") {
      timer = window.setTimeout(() => setMode("writing"), TRANSITION_DELAY_MS);
    } else if (mode === "transition-back-to-matching") {
      timer = window.setTimeout(() => {
        setQuestions((qArr) => shuffleArray(qArr));
        setCurrentIdx(0);
        setMode("matching");
      }, TRANSITION_DELAY_MS);
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [mode]);

  function handleAnswer(option: string | null) {
    if (option === null) return;

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

  function handlePairsProgressUpdate(matched: number, total: number) {
    setPairsProgress(matched);
  }

  function handlePronunciationProgressUpdate(current: number, total: number) {
    setPronunciationProgress(current);
  }

  function handleWritingProgressUpdate(current: number, total: number) {
    setWritingProgress(current);
  }

  function handlePairsComplete() {
    // Прогрес вже встановлений через onProgressUpdate
    setMode("transition-to-pronunciation");
  }

  function handlePronunciationComplete() {
    // Прогрес вже встановлений через onProgressUpdate
    setMode("transition-to-writing");
  }

  function handleWritingComplete() {
    // Прогрес вже встановлений через onProgressUpdate

    // Додаємо фрази з поточного циклу до списку повністю вивчених
    const newCompleted = new Set(cycleCompletedPhrases);
    matchingPool.forEach((phrase) => {
      if (phrase.id !== undefined) {
        newCompleted.add(phrase.id);
      }
    });
    setCycleCompletedPhrases(newCompleted);

    setMatchingPool([]);

    // Якщо більше немає фраз для вивчення
    if (questions.length === 0) {
      setFullyCompleted(true);
      setMode("finished");
      return;
    }

    // Показуємо екран макро-прогресу перед поверненням до matching
    setShowSessionProgress(true);
  }

  function handleContinueFromSessionProgress() {
    setShowSessionProgress(false);

    // Перемішуємо питання для нового циклу
    const shuffledQuestions = shuffleArray(questions);
    setQuestions(shuffledQuestions);

    // ВАЖЛИВО: скидаємо currentIdx, щоб прогрес обнулився
    setCurrentIdx(0);

    setMode("matching");
    setPairsProgress(0);
    setPronunciationProgress(0);
    setWritingProgress(0);

    // Очищаємо pool, щоб почати новий цикл
    setMatchingPool([]);
  }

  function handleFullReset() {
    setQuestions(prepareQuestions(exerciseData));
    setCurrentIdx(0);
    setMatchingPool([]);
    setMode("matching");
    setPairsKey((k) => k + 1);
    setFullyCompleted(false);
    setMakePhraseIdx(0);
    setCycleCompletedPhrases(new Set());
    setShowSessionProgress(false);
    setPairsProgress(0);
    setPronunciationProgress(0);
    setWritingProgress(0);
  }

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Session Progress Screen
  if (showSessionProgress) {
    return (
      <SessionProgressScreen
        fullyLearnedCount={cycleCompletedPhrases.size}
        totalPhrases={exerciseData.length}
        onContinue={handleContinueFromSessionProgress}
      />
    );
  }

  // Finished screen
  if (mode === "finished" || fullyCompleted) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-background overflow-y-auto p-4">
        <Card className="max-w-lg w-full text-center animate-fade-in">
          <CardHeader>
            <div className="text-6xl mb-4">🎉</div>
            <CardTitle className="text-3xl">
              {t("congratulations_finished")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg text-muted-foreground mb-4">
              {t("total_learned", "Всього вивчено")}:{" "}
              {cycleCompletedPhrases.size} / {exerciseData.length}
            </div>
            <Button size="lg" className="w-full" onClick={handleFullReset}>
              {t("start_over")}
            </Button>
            {onBack && (
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={onBack}
              >
                {t("back_to_exercise_selection")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Transition screens
  if (mode === "transition-to-make-phrase") {
    return (
      <TransitionScreen
        icon="✔️"
        title={t("great_make_phrase", "Чудово! Тепер склади фрази зі слів.")}
      />
    );
  }

  if (mode === "transition-to-pairs") {
    return (
      <TransitionScreen
        icon="✔️"
        title={t(
          "great_find_phrases",
          "Чудово! Тепер знайди фрази та їх переклади."
        )}
      />
    );
  }

  if (mode === "transition-to-pronunciation") {
    return (
      <TransitionScreen
        icon="✔️"
        title={t(
          "great_pronunciation",
          "Відмінно! Тепер повтори фрази вголос."
        )}
      />
    );
  }

  if (mode === "transition-to-writing") {
    return (
      <TransitionScreen
        icon="✔️"
        title={t("great_writing", "Супер! Тепер напиши слова з фраз.")}
      />
    );
  }

  if (mode === "transition-back-to-matching") {
    return (
      <TransitionScreen
        icon="✔️"
        title={t(
          "great_match_right_answer",
          "Чудово! Тепер обери правильну відповідь."
        )}
      />
    );
  }

  return (
    <div className="w-full h-full bg-background flex flex-col overflow-hidden">
      {/* Хедер з мікро-прогресом */}
      {!showSessionProgress && !mode.startsWith("transition") && (
        <ExerciseProgressHeader
          blockNumber={getBlockNumber(mode)}
          blockName={getBlockName(mode)}
          currentInCycle={getCurrentInCycle(mode)}
          totalInCycle={poolSize}
          onExit={onBack}
        />
      )}

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
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
                // Прогрес оновиться автоматично через getCurrentInCycle(),
                // який повертає makePhraseIdx (вже збільшений)
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
            onProgressUpdate={handlePairsProgressUpdate}
          />
        )}
        {mode === "pairs" && matchingPool.length < 2 && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-background overflow-y-auto p-4">
            <Card className="max-w-lg w-full text-center animate-fade-in">
              <CardHeader>
                <div className="text-6xl mb-4">🎉</div>
                <CardTitle className="text-3xl">
                  {t("congratulations_finished")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button size="lg" className="w-full" onClick={handleFullReset}>
                  {t("start_over")}
                </Button>
                {onBack && (
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    onClick={onBack}
                  >
                    {t("back_to_exercise_selection")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {mode === "pronunciation" && matchingPool.length >= 1 && (
          <PronunciationBlock
            phrases={matchingPool}
            cycles={1}
            onComplete={handlePronunciationComplete}
            onProgressUpdate={handlePronunciationProgressUpdate}
          />
        )}

        {mode === "writing" && matchingPool.length >= 1 && (
          <WritingExercise
            key={matchingPool.map((obj) => obj.id).join("_")}
            phrases={matchingPool}
            onComplete={handleWritingComplete}
            onProgressUpdate={handleWritingProgressUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default ExerciseSwitcher;
