import React, { useState, useEffect } from "react";
import { useAppContext } from "../AppContext";
import { speakSmart } from "../utils/ttsUtils";
import { useTranslation } from "react-i18next";

interface Phrase {
  id: number;
  phrase: string;
  answer: string;
  translation?: string;
  [key: string]: any;
}

interface Card {
  id: string;
  pairId: number;
  type: "phrase" | "translation";
  content: string;
}

interface MatchingPairsExerciseProps {
  phrases: Phrase[];
  onComplete?: () => void;
  onReset?: () => void;
}

function buildCards(phrases: Phrase[]): Card[] {
  let cards: Card[] = [];
  phrases.forEach((p) => {
    cards.push({
      id: p.id + "_phrase",
      pairId: p.id,
      type: "phrase",
      content: p.phrase.replace(/_+/, p.answer),
    });
    cards.push({
      id: p.id + "_translation",
      pairId: p.id,
      type: "translation",
      content: p.translation || "",
    });
  });
  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export default function MatchingPairsExercise({
  phrases,
  onComplete,
  onReset,
}: MatchingPairsExerciseProps) {
  const { t } = useTranslation();
  const { learningLanguage } = useAppContext();
  const [cards, setCards] = useState<Card[]>(() => buildCards(phrases));
  const [opened, setOpened] = useState<string[]>([]); // id карт
  const [matched, setMatched] = useState<string[]>([]); // id карт
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  function getStarRating(attempts: number): 0 | 1 | 2 | 3 {
    if (attempts <= 12) return 3;
    if (attempts <= 18) return 2;
    if (attempts <= 24) return 1;
    return 0;
  }

  useEffect(() => {
    setCards(buildCards(phrases));
    setOpened([]);
    setMatched([]);
    setLock(false);
    setMoves(0);
    setIsFinished(false);
  }, [phrases]);

  useEffect(() => {
    if (opened.length === 2) {
      setLock(true);
      setMoves((m) => m + 1);
      const first = cards.find((c) => c.id === opened[0]);
      const second = cards.find((c) => c.id === opened[1]);
      if (!first || !second) {
        setLock(false);
        setOpened([]);
        return;
      }
      if (first.pairId === second.pairId && first.type !== second.type) {
        setTimeout(() => {
          setMatched((m) => [...m, first.id, second.id]);
          setOpened([]);
          setLock(false);

          const phraseCard = [first, second].find((c) => c.type === "phrase");
          if (phraseCard) {
            speakSmart(phraseCard.content, {
              lang: learningLanguage?.code || "de-DE",
            });
          }
        }, 600);
      } else {
        setTimeout(() => {
          setOpened([]);
          setLock(false);
        }, 1900);
      }
    }
  }, [opened, cards, learningLanguage]);

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0 && !isFinished) {
      setTimeout(() => {
        setIsFinished(true);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 1500);
      }, 700);
    }
  }, [matched, cards, isFinished, onComplete]);

  function handleCardClick(id: string) {
    if (lock) return;
    if (opened.includes(id) || matched.includes(id)) return;
    if (opened.length === 2) return;
    setOpened((o) => [...o, id]);
  }

  return (
    <div className="flex flex-col h-full items-stretch w-full max-w-lg mx-auto min-h-[420px] p-2 sm:p-4 rounded-xl shadow bg-white relative">
      <div className="mb-2 text-center text-sm text-gray-600">
        {t("find_all_pairs")}
      </div>
      <div className="mb-2 text-center text-xs text-gray-500 flex items-center justify-center gap-3 flex-wrap">
        <span>
          {t("attempts")}: {moves}
        </span>

        {/* Легкий, непомітний текст-легенда; ховаємо на xs, показуємо з sm */}
        <span
          className="hidden sm:inline text-[11px] leading-snug text-gray-400/80 select-none"
          aria-label="Stars scoring rules"
        >
          0–12 = 3★ · 13–18 = 2★ · 19–24 = 1★
        </span>
      </div>

      <div
        className="
          grid
          grid-cols-3
          sm:grid-cols-4
          gap-2
          w-full
          max-w-xs
          sm:max-w-md
          mx-auto
          select-none
          relative
        "
        style={{ minHeight: "340px" }}
      >
        {cards.map((card) => {
          const isOpen = opened.includes(card.id) || matched.includes(card.id);
          const isMatched = matched.includes(card.id);
          const isSelected = opened.includes(card.id);

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={isOpen || lock || opened.length === 2}
              tabIndex={isOpen ? -1 : 0}
              className={`
                relative group w-full aspect-square min-h-[64px] max-h-[128px]
                rounded-xl shadow-md border-2 flex items-center justify-center
                transition-all duration-300
                ${
                  isMatched
                    ? "bg-green-200 border-green-400 text-green-700"
                    : isOpen
                    ? "bg-white border-blue-400"
                    : "bg-blue-100 border-blue-300"
                }
                outline-none
                focus:ring-2 focus:ring-blue-400
                overflow-hidden
              `}
              style={{
                perspective: "900px",
                zIndex: isSelected ? 10 : 1,
                transform: isSelected ? "scale(1.13)" : "scale(1)",
              }}
              aria-label={
                isOpen
                  ? card.content
                  : `Open card (${
                      card.type === "phrase" ? t("phrase") : t("translation")
                    })`
              }
            >
              {/* Face: Лицева сторона */}
              <span
                className="absolute inset-0 flex items-center justify-center transition-transform duration-400"
                style={{
                  transform: isOpen ? "rotateY(0deg)" : "rotateY(180deg)",
                  backfaceVisibility: "hidden",
                  fontWeight: isMatched ? "bold" : "normal",
                  fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
                  opacity: isOpen ? 1 : 0,
                  pointerEvents: "none",
                  padding: "0.25em",
                  textAlign: "center",
                  lineHeight: 1.15,
                  wordBreak: "break-word",
                  transition:
                    "transform 0.4s cubic-bezier(.6,2,.4,1), opacity 0.2s",
                  userSelect: "none",
                }}
              >
                {card.content}
              </span>
              {/* Back: Рубашка */}
              <span
                className="absolute inset-0 flex items-center justify-center transition-transform duration-400"
                style={{
                  transform: isOpen ? "rotateY(180deg)" : "rotateY(0deg)",
                  backfaceVisibility: "hidden",
                  fontSize: "1.3rem",
                  color: "#3b82f6",
                  fontWeight: 700,
                  opacity: isOpen ? 0 : 1,
                  pointerEvents: "none",
                  letterSpacing: "0.01em",
                  transition:
                    "transform 0.4s cubic-bezier(.6,2,.4,1), opacity 0.2s",
                  userSelect: "none",
                }}
              >
                🂠
              </span>
            </button>
          );
        })}
      </div>

      {isFinished && (
        <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-white bg-opacity-90 z-20">
          <div className="p-8 rounded-2xl shadow-xl bg-green-100 text-center max-w-xs mx-auto">
            <div className="text-4xl mb-2">🎉</div>
            <div className="flex items-center justify-center gap-1 mb-3">
              {Array.from({ length: 3 }).map((_, i) => {
                const filled = i < getStarRating(moves);
                return (
                  <span
                    key={i}
                    className={filled ? "text-yellow-400" : "text-gray-300"}
                    style={{ fontSize: "1.6rem", lineHeight: 1 }}
                    aria-hidden
                  >
                    ★
                  </span>
                );
              })}
            </div>
            <div className="font-bold text-xl mb-2">{t("congratulations")}</div>
            <div className="mb-2">{t("all_pairs_found")}</div>
            <div className="text-sm text-gray-600 mb-2">
              {t("attempts")}: {moves}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
