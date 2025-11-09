import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../contexts/SettingsContext";
import { useIrregularProgress } from "../../contexts/IrregularProgressContext";
import BackButton from "../BackButton";
import { Button } from "../ui/Button";
import { IrregularBlock, IrregularItem } from "./types";
import { ensureWarm, cancelSpeak, speakSmartAsync } from "../../utils/ttsUtils";
import { BlockCompletionScreen } from "./BlockCompletionScreen";
import { SpeakerSettings } from "./SpeakerSettings";

interface WordListSpeakerProps {
  blocks: IrregularBlock[];
  categoryId: string;
  categoryTitle: string;
}

const PAUSE_AFTER_TRANSLATION = 400; // мс фіксована пауза після перекладу

export default function WordListSpeaker({
  blocks,
  categoryId,
  categoryTitle,
}: WordListSpeakerProps) {
  const { blockId } = useParams<{ blockId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { learningLanguage } = useSettings();
  const { markBlockCompleted } = useIrregularProgress();

  const block = blocks.find((b) => b.id === parseInt(blockId || "0", 10));

  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Налаштування з localStorage
  const [speed, setSpeed] = useState(() => {
    try {
      const saved = localStorage.getItem("mp_irregular_speaker_speed");
      return saved ? parseFloat(saved) : 0.85;
    } catch {
      return 0.85;
    }
  });

  const [pauseBetweenItems, setPauseBetweenItems] = useState(() => {
    try {
      const saved = localStorage.getItem("mp_irregular_speaker_pause");
      return saved ? parseInt(saved, 10) : 800;
    } catch {
      return 800;
    }
  });

  const stopRequestedRef = useRef(false);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const LANG = learningLanguage?.code || "de-DE";

  // Warm-up TTS при монтуванні
  useEffect(() => {
    ensureWarm(LANG);
  }, [LANG]);

  // Auto-scroll до поточного елемента
  useEffect(() => {
    if (currentIndex !== null && itemRefs.current[currentIndex]) {
      itemRefs.current[currentIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex]);

  // Cleanup при розмонтуванні
  useEffect(() => {
    return () => {
      cancelSpeak();
    };
  }, []);

  const formatItem = (item: IrregularItem): string => {
    if (item.article && item.plural) {
      return `${item.article} ${item.german} — ${item.plural}`;
    }
    if (item.prateritum && item.partizip) {
      return `${item.german} — ${item.prateritum} — ${item.partizip}`;
    }
    if (item.ich) {
      return `ich ${item.ich}, du ${item.du}, er/sie/es ${item.er}, wir ${item.wir}, ihr ${item.ihr}, sie ${item.sie}`;
    }
    return item.german;
  };

  const playFromIndex = async (startIdx: number) => {
    if (!block || startIdx >= block.items.length) return;

    await ensureWarm(LANG);
    stopRequestedRef.current = false;
    setIsPaused(false);

    const speakNext = async (idx: number) => {
      if (stopRequestedRef.current || idx >= block.items.length) {
        setIsPaused(true);
        if (idx >= block.items.length) {
          markBlockCompleted(categoryId, block.id);
          setCurrentIndex(block.items.length - 1);
          setTimeout(() => setShowCompletion(true), 500);
        }
        return;
      }

      const item = block.items[idx];
      setCurrentIndex(idx);

      const germanText = formatItem(item);

      try {
        await speakSmartAsync(germanText, { lang: LANG, rate: speed });

        if (stopRequestedRef.current) return;

        await new Promise((r) => setTimeout(r, PAUSE_AFTER_TRANSLATION));

        if (stopRequestedRef.current) return;

        if (showTranslation && item.translation) {
          await speakSmartAsync(item.translation, {
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
    if (!block) return;
    stopRequestedRef.current = true;
    cancelSpeak();
    setIsPaused(true);
    const nextIndex =
      currentIndex === null
        ? 0
        : Math.min(block.items.length - 1, currentIndex + 1);
    setCurrentIndex(nextIndex);
  };

  const handlePrev = () => {
    stopRequestedRef.current = true;
    cancelSpeak();
    setIsPaused(true);
    const prevIndex = currentIndex === null ? 0 : Math.max(0, currentIndex - 1);
    setCurrentIndex(prevIndex);
  };

  const handleRepeatBlock = () => {
    setShowCompletion(false);
    stopRequestedRef.current = true;
    cancelSpeak();
    setCurrentIndex(null);
    setIsPaused(true);
  };

  const handleNextBlock = () => {
    if (!block) return;
    const nextBlockId = block.id + 1;
    const nextBlock = blocks.find((b) => b.id === nextBlockId);
    if (nextBlock) {
      navigate(`/irregular/${categoryId}/block/${nextBlockId}`);
    } else {
      navigate(`/irregular/${categoryId}`);
    }
  };

  const handleBackToCategory = () => {
    navigate(`/irregular/${categoryId}`);
  };

  const handleSettingsConfirm = (newSpeed: number, newPause: number) => {
    setSpeed(newSpeed);
    setPauseBetweenItems(newPause);
    localStorage.setItem("mp_irregular_speaker_speed", String(newSpeed));
    localStorage.setItem("mp_irregular_speaker_pause", String(newPause));
    setSettingsOpen(false);

    // Якщо відтворюється - перезапустити з новими налаштуваннями
    if (!isPaused) {
      stopRequestedRef.current = true;
      cancelSpeak();
      setTimeout(() => {
        playFromIndex(currentIndex === null ? 0 : currentIndex);
      }, 100);
    }
  };

  // Екран завершення
  if (showCompletion && block) {
    return (
      <BlockCompletionScreen
        categoryId={categoryId}
        currentBlockId={block.id}
        totalBlocks={blocks.length}
        onRepeat={handleRepeatBlock}
        onNext={handleNextBlock}
        onBackToCategory={handleBackToCategory}
      />
    );
  }

  // Блок не знайдено
  if (!block) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">❓</div>
          <div className="text-xl font-semibold">
            {t("block_not_found", "Блок не знайдено")}
          </div>
          <Button
            onClick={() => navigate(`/irregular/${categoryId}`)}
            className="mt-4"
          >
            {t("back_to_category", "Повернутися до категорії")}
          </Button>
        </div>
      </div>
    );
  }

  // Основний інтерфейс
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header (Fixed Top) */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <BackButton to={`/irregular/${categoryId}`} />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {categoryTitle} — {t("block", "Блок")} {block.id + 1}
              </h1>
              <p className="text-sm text-muted-foreground">
                {block.items.length} {t("items", "елементів")} • {block.level}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-3">
            {block.items.map((item, idx) => (
              <div
                key={item.id}
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
                  {formatItem(item)}
                </div>
                {showTranslation && item.translation && (
                  <div className="text-sm text-muted-foreground italic mt-2">
                    {item.translation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Control Panel (Fixed Bottom) */}
      <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {/* Рядок налаштувань */}
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showTranslation}
                onChange={(e) => setShowTranslation(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span>{t("show_translation", "Показати переклад")}</span>
            </label>

            <button
              onClick={() => setSettingsOpen(true)}
              className="text-2xl hover:scale-110 transition-transform"
              title={t("settings", "Налаштування")}
            >
              ⚙️
            </button>
          </div>

          {/* Головні кнопки управління */}
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={handleRepeatBlock}
              variant="outline"
              size="lg"
              className="w-14 h-14 text-2xl"
              title={t("repeat_block", "Повторити блок")}
            >
              🔄
            </Button>
            <Button
              onClick={handlePrev}
              variant="outline"
              size="lg"
              className="w-14 h-14 text-2xl"
              disabled={currentIndex === 0}
            >
              ◀️
            </Button>
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="w-20 h-16 text-3xl font-bold shadow-lg"
            >
              {isPaused ? "▶️" : "⏸"}
            </Button>
            <Button
              onClick={handleNext}
              variant="outline"
              size="lg"
              className="w-14 h-14 text-2xl"
              disabled={
                currentIndex !== null && currentIndex >= block.items.length - 1
              }
            >
              ▶️
            </Button>
            <Button
              onClick={handleNextBlock}
              variant="outline"
              size="lg"
              className="w-14 h-14 text-2xl"
              title={t("next_block", "Наступний блок")}
            >
              ⏭️
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
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
