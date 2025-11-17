import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../contexts/SettingsContext";
import { useNounProgress } from "../../contexts/NounProgressContext";
import BackButton from "../BackButton";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { SpeakerSettings } from "./SpeakerSettings";
import { NounQuiz } from "./NounQuiz";
import { fetchNounsByWordSet, generateQuiz } from "../../api/nounsApi";
import { NounData, QuizQuestion } from "../../api/nounsApi";
import { ensureWarm, cancelSpeak, speakSmartAsync } from "../../utils/ttsUtils";
import { BlockCompletionScreen } from "./BlockCompletionScreen";

const PAUSE_AFTER_TRANSLATION = 400;

type LearningPhase =
  | "learning1"
  | "quiz1"
  | "learning2"
  | "quiz2"
  | "completed";

export default function NounLearningPage() {
  const { supersetId, setId } = useParams<{
    supersetId: string;
    setId: string;
  }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { learningLanguage, interfaceLanguage } = useSettings();
  const { markSetCompleted } = useNounProgress();

  const [nouns, setNouns] = useState<NounData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<LearningPhase>("learning1");
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);

  const [speed, setSpeed] = useState(() => {
    try {
      return parseFloat(
        localStorage.getItem("mp_irregular_speaker_speed") || "0.85"
      );
    } catch {
      return 0.85;
    }
  });

  const [pauseBetweenItems, setPauseBetweenItems] = useState(() => {
    try {
      return parseInt(
        localStorage.getItem("mp_irregular_speaker_pause") || "800",
        10
      );
    } catch {
      return 800;
    }
  });

  const stopRequestedRef = useRef(false);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const LANG = learningLanguage?.code || "de-DE";

  useEffect(() => {
    const loadNouns = async () => {
      try {
        setLoading(true);
        const data = await fetchNounsByWordSet(
          Number(setId),
          interfaceLanguage?.code || "uk"
        );
        setNouns(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (setId) loadNouns();
  }, [setId, interfaceLanguage]);

  useEffect(() => {
    ensureWarm(LANG);
  }, [LANG]);

  useEffect(() => {
    if (currentIndex !== null && itemRefs.current[currentIndex]) {
      itemRefs.current[currentIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      cancelSpeak();
    };
  }, []);

  const formatNoun = (noun: NounData): string => {
    return `${noun.article} ${noun.word} — ${noun.plural || "-"}`;
  };

  const getVisibleNouns = (): NounData[] => {
    if (phase === "learning1" || phase === "quiz1") {
      return nouns.slice(0, 9); // Перші 9 слів
    }
    return nouns; // Всі 18 слів для learning2 та quiz2
  };

  const playFromIndex = async (startIdx: number) => {
    const visible = getVisibleNouns();
    if (startIdx >= visible.length) return;

    await ensureWarm(LANG);
    stopRequestedRef.current = false;
    setIsPaused(false);

    const speakNext = async (idx: number) => {
      if (stopRequestedRef.current || idx >= visible.length) {
        setIsPaused(true);
        if (idx >= visible.length) {
          // Завершили частину
          if (phase === "learning1") {
            setPhase("quiz1");
            setQuiz(generateQuiz(nouns.slice(0, 9), 4));
          } else if (phase === "learning2") {
            setPhase("quiz2");
            setQuiz(generateQuiz(nouns, 5));
          }
        }
        return;
      }

      const noun = visible[idx];
      setCurrentIndex(idx);

      const germanText = formatNoun(noun);

      try {
        await speakSmartAsync(germanText, { lang: LANG, rate: speed });
        if (stopRequestedRef.current) return;

        await new Promise((r) => setTimeout(r, PAUSE_AFTER_TRANSLATION));
        if (stopRequestedRef.current) return;

        if (showTranslation && noun.translation) {
          await speakSmartAsync(noun.translation, {
            lang: "uk-UA",
            rate: speed,
          });
        }

        if (stopRequestedRef.current) return;
        await new Promise((r) => setTimeout(r, pauseBetweenItems));

        await speakNext(idx + 1);
      } catch (error) {
        console.error("Speech error:", error);
        setIsPaused(true);
      }
    };

    await speakNext(startIdx);
  };

  const handlePlayPause = () => {
    if (isPaused) {
      const startIndex = currentIndex === null ? 0 : currentIndex;
      playFromIndex(startIndex);
    } else {
      stopRequestedRef.current = true;
      cancelSpeak();
      setIsPaused(true);
    }
  };

  const handleNext = () => {
    const visible = getVisibleNouns();
    stopRequestedRef.current = true;
    cancelSpeak();
    setIsPaused(true);
    const nextIndex =
      currentIndex === null
        ? 0
        : Math.min(visible.length - 1, currentIndex + 1);
    setCurrentIndex(nextIndex);
  };

  const handlePrev = () => {
    stopRequestedRef.current = true;
    cancelSpeak();
    setIsPaused(true);
    const prevIndex = currentIndex === null ? 0 : Math.max(0, currentIndex - 1);
    setCurrentIndex(prevIndex);
  };

  const handleRepeat = () => {
    stopRequestedRef.current = true;
    cancelSpeak();
    setCurrentIndex(null);
    setIsPaused(true);
  };

  const handleSettingsConfirm = (newSpeed: number, newPause: number) => {
    setSpeed(newSpeed);
    setPauseBetweenItems(newPause);
    localStorage.setItem("mp_irregular_speaker_speed", String(newSpeed));
    localStorage.setItem("mp_irregular_speaker_pause", String(newPause));
    setSettingsOpen(false);

    if (!isPaused) {
      stopRequestedRef.current = true;
      cancelSpeak();
      setTimeout(() => {
        playFromIndex(currentIndex === null ? 0 : currentIndex);
      }, 100);
    }
  };

  const handleQuizComplete = (score: number) => {
    if (phase === "quiz1") {
      setPhase("learning2");
      setCurrentIndex(null);
    } else if (phase === "quiz2") {
      markSetCompleted(Number(supersetId), Number(setId));
      setPhase("completed");
    }
  };

  const handleQuizSkip = () => {
    if (phase === "quiz1") {
      setPhase("learning2");
    } else if (phase === "quiz2") {
      markSetCompleted(Number(supersetId), Number(setId));
      setPhase("completed");
    }
  };

  const handleRepeatSet = () => {
    setPhase("learning1");
    setCurrentIndex(null);
    setIsPaused(true);
    stopRequestedRef.current = true;
    cancelSpeak();
  };

  const handleNextSet = () => {
    // TODO: реалізувати перехід до наступного комплекту
    navigate(`/nouns/${supersetId}`);
  };

  const handleBackToSets = () => {
    navigate(`/nouns/${supersetId}`);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-2xl">⏳ {t("loading", "Завантаження")}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <EmptyState
          icon={<span className="text-6xl">❌</span>}
          title={t("error", "Помилка")}
          description={error}
        />
      </div>
    );
  }

  if (phase === "completed") {
    return (
      <BlockCompletionScreen
        categoryId={`nouns-${supersetId}`}
        currentBlockId={Number(setId)}
        totalBlocks={10}
        onRepeat={handleRepeatSet}
        onNext={handleNextSet}
        onBackToCategory={handleBackToSets}
      />
    );
  }

  if (phase === "quiz1" || phase === "quiz2") {
    return (
      <NounQuiz
        questions={quiz}
        onComplete={handleQuizComplete}
        onSkip={handleQuizSkip}
      />
    );
  }

  const visibleNouns = getVisibleNouns();

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <BackButton to={`/nouns/${supersetId}`} />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                📘 {t("noun_learning", "Вивчення іменників")} —{" "}
                {t("set", "Комплект")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {phase === "learning1"
                  ? t("part_1", "Частина 1 (1-9)")
                  : t("part_2", "Частина 2 (10-18)")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-3">
            {visibleNouns.map((noun, idx) => (
              <div
                key={noun.word_id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                className={`p-4 rounded-lg border transition-all ${
                  idx === currentIndex
                    ? "bg-accent border-primary shadow-md scale-[1.02]"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <div className="font-semibold text-foreground text-lg">
                  {formatNoun(noun)}
                </div>
                {showTranslation && noun.translation && (
                  <div className="text-sm text-muted-foreground italic mt-2">
                    {noun.translation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between mb-3 gap-2">
            <label className="flex items-center gap-2 text-sm sm:text-base text-foreground cursor-pointer min-w-0">
              <input
                type="checkbox"
                checked={showTranslation}
                onChange={(e) => setShowTranslation(e.target.checked)}
                className="w-5 h-5 flex-shrink-0 accent-primary"
              />
              <span className="truncate">
                {t("show_translation", "Показати переклад")}
              </span>
            </label>

            <button
              onClick={() => setSettingsOpen(true)}
              className="text-xl sm:text-2xl flex-shrink-0 hover:scale-110 transition-transform p-2"
              title={t("settings", "Налаштування")}
            >
              ⚙️
            </button>
          </div>

          <div className="flex items-center justify-center gap-2.5 sm:gap-3">
            <Button
              onClick={handleRepeat}
              variant="outline"
              size="lg"
              className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-2xl p-0 flex-shrink-0"
              title={t("repeat", "Повторити")}
            >
              🔄
            </Button>
            <Button
              onClick={handlePrev}
              variant="outline"
              size="lg"
              className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-2xl p-0 flex-shrink-0"
              disabled={currentIndex === 0}
            >
              ◀️
            </Button>
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="w-16 h-12 sm:w-20 sm:h-16 text-2xl sm:text-3xl font-bold shadow-lg flex-shrink-0 p-0"
            >
              {isPaused ? "▶️" : "⏸"}
            </Button>
            <Button
              onClick={handleNext}
              variant="outline"
              size="lg"
              className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-2xl p-0 flex-shrink-0"
              disabled={
                currentIndex !== null && currentIndex >= visibleNouns.length - 1
              }
            >
              ▶️
            </Button>
            <Button
              onClick={() => {
                if (phase === "learning1") {
                  setPhase("quiz1");
                  setQuiz(generateQuiz(nouns.slice(0, 9), 4));
                } else {
                  setPhase("quiz2");
                  setQuiz(generateQuiz(nouns, 5));
                }
              }}
              variant="outline"
              size="lg"
              className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-2xl p-0 flex-shrink-0"
              title={t("quiz", "Тест")}
            >
              🧪
            </Button>
          </div>
        </div>
      </div>

      <SpeakerSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConfirm={handleSettingsConfirm}
        initialSpeed={speed}
        initialPause={pauseBetweenItems}
      />
    </div>
  );
}
