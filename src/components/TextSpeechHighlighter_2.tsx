import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAppContext } from "../AppContext";
import { useTranslation } from "react-i18next";

const REFERENCE_LENGTH = 30;
const PRE_SENTENCE_DELAY = 200;
const MAX_PAUSE = 7;
const WAKELOCK_SUPPORTED =
  typeof window !== "undefined" && "wakeLock" in navigator;

function splitToSentences(str?: string): string[] {
  if (!str) return [];
  return str.match(/[^.!?]+[.!?"]?/g) || [];
}

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rate: number, pauseBase: number) => void;
  initialReadingRate: number;
  initialPauseBase: number;
}

function SettingsMenu({
  isOpen,
  onClose,
  onConfirm,
  initialReadingRate,
  initialPauseBase,
}: SettingsMenuProps) {
  const { t } = useTranslation();
  const rates = [
    { value: 0.7, label: "🐢", desc: t("very_slow") },
    { value: 0.85, label: "🚶", desc: t("medium") },
    { value: 1.0, label: "🐇", desc: t("fast") },
  ];

  const [localReadingRate, setLocalReadingRate] = useState(initialReadingRate);
  const [localPauseBase, setLocalPauseBase] = useState(initialPauseBase);

  useEffect(() => {
    setLocalReadingRate(initialReadingRate);
    setLocalPauseBase(initialPauseBase);
  }, [initialReadingRate, initialPauseBase, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute right-4 top-16 bg-white border border-gray-300 rounded-md shadow-md p-4 z-10 text-sm w-72">
      <div className="mb-4">
        <div className="font-semibold mb-1">{t("reading_speed")}</div>
        <div className="flex gap-3">
          {rates.map((rate) => (
            <button
              key={rate.value}
              onClick={() => setLocalReadingRate(rate.value)}
              className={`py-1 px-3 rounded font-bold transition
                ${
                  localReadingRate === rate.value
                    ? "bg-blue-500 text-white shadow"
                    : "bg-gray-200 text-gray-700 hover:bg-blue-100"
                }`}
              title={rate.desc}
            >
              {rate.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <div className="font-semibold mb-1 flex items-center">
          {t("pause_after_sentence")}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-6 text-right">0</span>
          <input
            type="range"
            min={0}
            max={MAX_PAUSE}
            step={0.05}
            value={localPauseBase}
            onChange={(e) => setLocalPauseBase(Number(e.target.value))}
            className="w-full accent-blue-500"
            style={{ verticalAlign: "middle" }}
          />
          <span className="text-xs text-gray-500 w-7 text-left">
            {localPauseBase.toFixed(2)}
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {t("longer_sentences_longer_pause")}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onClose}
          className="py-1 px-4 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          {t("cancel")}
        </button>
        <button
          onClick={() => onConfirm(localReadingRate, localPauseBase)}
          className="py-1 px-4 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600"
        >
          {t("ok")}
        </button>
      </div>
    </div>
  );
}

interface TextSpeechHighlighterProps {
  text?: string;
  translation?: string;
}

function getTTSLang(code?: string) {
  if (!code) return "de-DE";
  if (code.startsWith("de")) return "de-DE";
  if (code.startsWith("en")) return "en-US";
  return code;
}

export default function TextSpeechHighlighter({
  text,
  translation,
}: TextSpeechHighlighterProps) {
  const { t } = useTranslation();
  const { learningLanguage, ttsSettings, setTtsSettings } =
    useAppContext() as ReturnType<typeof useAppContext> & {
      ttsSettings?: { readingRate: number; pauseBase: number };
      setTtsSettings?: (s: { readingRate: number; pauseBase: number }) => void;
    };

  const LANG = getTTSLang(learningLanguage?.code);

  // --- Використовуємо глобальні налаштування з AppContext ---
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<
    number | null
  >(null);
  const [isPaused, setIsPaused] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Якщо немає глобальних налаштувань — дефолт
  const readingRate = ttsSettings?.readingRate ?? 0.85;
  const pauseBase = ttsSettings?.pauseBase ?? 1;

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const stopRequestedRef = useRef(false);
  const sentenceRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const wakeLockRef = useRef<any>(null);
  const pauseTimeoutRef = useRef<number | null>(null);

  const sentences = useMemo(() => splitToSentences(text), [text]);
  const translations = useMemo(
    () => splitToSentences(translation),
    [translation]
  );

  // WAKE LOCK API
  const requestWakeLock = async () => {
    if (WAKELOCK_SUPPORTED && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request(
          "screen"
        );
      } catch (e) {
        // ignore
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (e) {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (!WAKELOCK_SUPPORTED) return;

    if (!isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isPaused) {
        requestWakeLock();
      } else if (document.visibilityState === "hidden") {
        releaseWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isPaused]);

  useEffect(() => {
    if (
      currentSentenceIndex !== null &&
      sentenceRefs.current[currentSentenceIndex]
    ) {
      sentenceRefs.current[currentSentenceIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentSentenceIndex, text]);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      const utter = new window.SpeechSynthesisUtterance(" .");
      utter.lang = LANG;
      utter.volume = 0;
      window.speechSynthesis.speak(utter);
    }
  }, [LANG]);

  function getPauseForSentence(sentence: string): number {
    if (pauseBase === 0) return 0;
    let pause = (sentence.length / REFERENCE_LENGTH) * pauseBase;
    if (pause < 0) pause = 0;
    if (pause > MAX_PAUSE) pause = MAX_PAUSE;
    return pause;
  }

  const playTextFrom = (
    startIdx = 0,
    rate = readingRate,
    pause = pauseBase
  ) => {
    if (!sentences.length || startIdx >= sentences.length) return;
    stopRequestedRef.current = false;
    setIsPaused(false);
    setCurrentSentenceIndex(startIdx);

    requestWakeLock();

    const speakNext = (idx: number) => {
      if (stopRequestedRef.current || idx >= sentences.length) {
        setIsPaused(true);
        setCurrentSentenceIndex(
          idx < sentences.length ? idx : sentences.length - 1
        );
        releaseWakeLock();
        return;
      }
      const sentence = sentences[idx].trim();
      if (!sentence) {
        speakNext(idx + 1);
        return;
      }

      const dummy = new window.SpeechSynthesisUtterance(" ");
      dummy.lang = LANG;
      dummy.volume = 0;
      window.speechSynthesis.speak(dummy);

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = LANG;
        utterance.rate = rate;

        const assignVoiceAndSpeak = () => {
          const voices = window.speechSynthesis.getVoices();
          const googleVoice = voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith(LANG.toLowerCase().slice(0, 2)) &&
              v.name.toLowerCase().includes("google")
          );
          const langVoice = voices.find((v) =>
            v.lang.toLowerCase().startsWith(LANG.toLowerCase().slice(0, 2))
          );
          utterance.voice = googleVoice || langVoice || voices[0];

          utterance.onend = () => {
            const pauseMs = getPauseForSentence(sentence);
            pauseTimeoutRef.current = window.setTimeout(() => {
              pauseTimeoutRef.current = null;
              if (!stopRequestedRef.current) {
                setCurrentSentenceIndex(idx + 1);
                speakNext(idx + 1);
              }
            }, Math.max(0, Math.min(pauseMs, MAX_PAUSE)) * 1000);
          };
          utterance.onerror = () => {
            setIsPaused(true);
            setCurrentSentenceIndex(idx);
            releaseWakeLock();
          };

          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
          utteranceRef.current = utterance;
          setCurrentSentenceIndex(idx);
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          assignVoiceAndSpeak();
        } else {
          const handleVoicesChanged = () => {
            assignVoiceAndSpeak();
            window.speechSynthesis.removeEventListener(
              "voiceschanged",
              handleVoicesChanged
            );
          };
          window.speechSynthesis.addEventListener(
            "voiceschanged",
            handleVoicesChanged
          );
        }
      }, PRE_SENTENCE_DELAY);
    };

    speakNext(startIdx);
  };

  const handlePlayPause = () => {
    if (isPaused) {
      const startIndex =
        currentSentenceIndex == null ? 0 : currentSentenceIndex;
      stopRequestedRef.current = false;
      playTextFrom(startIndex, readingRate, pauseBase);
    } else {
      stopRequestedRef.current = true;
      window.speechSynthesis.cancel();
      setIsPaused(true);
      releaseWakeLock();
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
    }
  };

  const handleNext = () => {
    const nextIndex =
      currentSentenceIndex === null
        ? 0
        : Math.min(sentences.length - 1, currentSentenceIndex + 1);
    stopRequestedRef.current = true;
    window.speechSynthesis.cancel();
    setIsPaused(true);
    setCurrentSentenceIndex(nextIndex);
    releaseWakeLock();
  };

  const handlePrev = () => {
    const prevIndex =
      currentSentenceIndex === null ? 0 : Math.max(0, currentSentenceIndex - 1);
    stopRequestedRef.current = true;
    window.speechSynthesis.cancel();
    setIsPaused(true);
    setCurrentSentenceIndex(prevIndex);
    releaseWakeLock();
  };

  useEffect(() => {
    setIsPaused(true);
    setCurrentSentenceIndex(null);
    releaseWakeLock();
    utteranceRef.current = null;
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  }, [text]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      releaseWakeLock();
    };
  }, []);

  // --- Зберігаємо налаштування глобально через AppContext ---
  const handleSettingsConfirm = (newRate: number, newPause: number) => {
    setSettingsOpen(false);
    if (setTtsSettings) {
      setTtsSettings({ readingRate: newRate, pauseBase: newPause });
    }
    if (!isPaused) {
      stopRequestedRef.current = true;
      window.speechSynthesis.cancel();
      setTimeout(() => {
        playTextFrom(
          currentSentenceIndex == null ? 0 : currentSentenceIndex,
          newRate,
          newPause
        );
      }, 80);
    }
  };

  const handleSettingsCancel = () => {
    setSettingsOpen(false);
  };

  if (!text) {
    return (
      <div className="text-gray-500 italic text-center py-8">
        {t("no_text_available")}
      </div>
    );
  }

  return (
    <div className="fullscreen-fix overflow-hidden flex flex-col bg-blue-50 relative">
      <div className="flex-1 overflow-auto px-4 py-2">
        <div className="max-w-xl w-full mx-auto rounded-xl shadow bg-white flex flex-col items-center p-4">
          {/* Текст */}
          <div
            className="text-xl w-full text-left leading-snug mb-4 overflow-x-hidden px-2"
            style={{
              wordBreak: "break-word",
              minHeight: "10.8em",
              maxHeight: "10.8em",
            }}
          >
            {sentences.map((sentence, i) => (
              <span
                key={i}
                ref={(el) => {
                  if (el) sentenceRefs.current[i] = el;
                }}
                className={`transition px-1 rounded-sm ${
                  i === currentSentenceIndex ? "bg-yellow-200" : ""
                }`}
                style={{ display: "inline" }}
              >
                {sentence.trim()}{" "}
              </span>
            ))}
          </div>

          {/* Блок перекладу */}
          <div
            className="mb-4 text-gray-700 text-lg text-center italic px-2 overflow-hidden flex items-center justify-center"
            style={{ minHeight: "6.8em", maxHeight: "6.8em" }}
          >
            {showTranslation &&
            currentSentenceIndex !== null &&
            translations[currentSentenceIndex]
              ? translations[currentSentenceIndex]
              : ""}
          </div>

          <div className="mb-4 w-full flex items-center justify-center">
            <label className="flex items-center cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={showTranslation}
                onChange={(e) => setShowTranslation(e.target.checked)}
                className="accent-blue-500 mr-2"
              />
              {t("show_translation")}
            </label>
          </div>

          {/* Кнопки */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mt-2">
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={handlePrev}
                title={t("previous")}
                className="text-gray-700 hover:text-black p-2 rounded-full"
                style={{
                  fontSize: "clamp(2rem, 6vw, 2.7rem)",
                  minWidth: "clamp(40px, 10vw, 56px)",
                  minHeight: "clamp(40px, 10vw, 56px)",
                }}
              >
                ◀️
              </button>
              <button
                onClick={handlePlayPause}
                title={isPaused ? t("play") : t("pause")}
                className="text-green-600 hover:text-green-800 p-2 rounded-full shadow-md"
                style={{
                  fontSize: "clamp(2.2rem, 7vw, 3rem)",
                  minWidth: "clamp(48px, 12vw, 64px)",
                  minHeight: "clamp(48px, 12vw, 64px)",
                }}
              >
                {isPaused ? "▶️" : "⏸"}
              </button>
              <button
                onClick={handleNext}
                title={t("next")}
                className="text-gray-700 hover:text-black p-2 rounded-full"
                style={{
                  fontSize: "clamp(2rem, 6vw, 2.7rem)",
                  minWidth: "clamp(40px, 10vw, 56px)",
                  minHeight: "clamp(40px, 10vw, 56px)",
                }}
              >
                ▶️
              </button>
            </div>
            {/* Кнопка налаштувань */}
            <button
              onClick={() => setSettingsOpen(true)}
              title={t("settings")}
              className="text-gray-700 hover:text-black p-2 rounded-full"
              style={{
                fontSize: "clamp(2rem, 6vw, 2.7rem)",
                minWidth: "clamp(40px, 10vw, 56px)",
                minHeight: "clamp(40px, 10vw, 56px)",
                marginLeft: "clamp(1rem, 7vw, 2.5rem)",
              }}
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* Меню налаштувань */}
      <SettingsMenu
        isOpen={settingsOpen}
        onClose={handleSettingsCancel}
        onConfirm={handleSettingsConfirm}
        initialReadingRate={readingRate}
        initialPauseBase={pauseBase}
      />
    </div>
  );
}
