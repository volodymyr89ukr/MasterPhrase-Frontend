import React, { useState, useRef, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { speakSmart, cancelSpeak } from "../utils/ttsUtils";
import { useTranslation } from "react-i18next";

interface Phrase {
  phrase: string;
  answer?: string;
  translation?: string;
  [key: string]: any;
}

interface PronunciationBlockProps {
  phrases: Phrase[];
  cycles?: number;
  onComplete?: () => void;
  onProgressUpdate?: (current: number, total: number) => void;
}

export default function PronunciationBlock({
  phrases = [],
  cycles = 1,
  onComplete,
  onProgressUpdate,
}: PronunciationBlockProps) {
  const { t } = useTranslation();
  const { learningLanguage } = useSettings();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaSupported, setMediaSupported] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [recordingStart, setRecordingStart] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  // Встановлюємо початковий прогрес = 0 при монтуванні
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate(0, phrases.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrases.length]);

  const curr = phrases[currentIdx];
  const fullPhrase = curr?.phrase?.replace(/_+/, curr?.answer || "") || "";
  const translation = curr?.translation || "";

  function speakPhraseTTS() {
    speakSmart(fullPhrase, {
      lang: learningLanguage?.code || "de-DE",
      rate: 0.73,
    });
  }

  useEffect(() => {
    setMediaSupported(!!window?.MediaRecorder);
  }, []);

  useEffect(() => {
    setRecordedBlob(null);
    setIsRecording(false);
    setMediaError("");
    setRecordingStart(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
  }, [currentIdx]);

  const startRecording = async () => {
    setMediaError("");
    if (!mediaSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
      setIsRecording(true);
      setRecordingStart(Date.now());
      setRecordedBlob(null);
      recorder.start();
    } catch (err) {
      setMediaError(t("microphone_access_error"));
      setMediaSupported(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const playRecording = () => {
    if (recordedBlob && audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.play();
    }
  };

  useEffect(() => {
    if (recordedBlob && recordingStart) {
      const now = Date.now();
      const pause = now - recordingStart;
      if (pause < 200) {
        setTimeout(() => {}, 200 - pause);
      }
    }
  }, [recordedBlob, recordingStart]);

  const handleNext = () => {
    if (currentIdx < phrases.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);

      // Оновлюємо прогрес: завершено currentIdx + 1 фраз
      if (onProgressUpdate) {
        onProgressUpdate(currentIdx + 1, phrases.length);
      }
    } else {
      // Встановлюємо прогрес на максимум: завершено всі фрази
      if (onProgressUpdate) {
        onProgressUpdate(phrases.length, phrases.length);
      }

      // Викликаємо onComplete тільки після завершення всіх фраз
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleRepeat = () => {
    setRecordedBlob(null);
    setIsRecording(false);
    setMediaError("");
    setRecordingStart(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    return () => {
      cancelSpeak(); // ✅ централізований cleanup
      setRecordedBlob(null);
      setIsRecording(false);
    };
  }, []);

  if (!phrases.length) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-muted-foreground text-lg">
          {t("no_phrases_available")}
        </div>
      </div>
    );
  }

  // ВСТАВТЕ ЦЕЙ НОВИЙ КОД (~рядок 198)

  return (
    <div className="flex flex-col h-full w-full items-stretch p-0 m-0">
      {/* === 1. Content Area (Grows, Scrolls, Centers Content) === */}
      {/* flex-1: Займає весь доступний простір, відштовхуючи кнопку "Далі" вниз.
        overflow-y-auto: Дозволяє контенту скролитись, якщо він не вміщується (малий екран).
        min-h-0: Потрібен для коректної роботи flex-1 + overflow.
      */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* h-full, flex, justify-center: Центрує весь вміст 
          вертикально у просторі, який надав flex-1.
        */}
        <div className="max-w-lg w-full min-w-[320px] mx-auto h-full flex flex-col items-center justify-center p-4">
          {/* Фраза */}
          <div className="text-2xl text-center font-medium my-4 min-h-[3.2em] px-3 py-2 rounded">
            {fullPhrase}
          </div>

          {/* Переклад (умовний) */}
          {showTranslation && (
            <div className="text-lg text-muted-foreground text-center italic mb-2 min-h-[2em]">
              {translation}
            </div>
          )}

          {/* === Блок кнопок аудіо (з виправленими іконками) === */}
          <div className="flex gap-4 mb-4">
            {/* 1. Слухати носія (Оригінал) */}
            <button
              onClick={speakPhraseTTS}
              title={t("listen_to_phrase")}
              className="text-success hover:text-success/80 p-2 rounded-full shadow-md border bg-card transition-colors"
              style={{ fontSize: "2.2rem", minWidth: 48 }}
              tabIndex={0}
            >
              🔊
            </button>

            {/* 2. Записати / Зупинити / (Перезаписати) */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-full shadow-md border font-bold text-white transition-colors ${
                isRecording
                  ? "bg-destructive animate-pulse"
                  : "bg-primary hover:bg-primary/90"
              }`}
              style={{ fontSize: "2.2rem", minWidth: 48 }}
              tabIndex={0}
              disabled={!mediaSupported}
              title={
                isRecording
                  ? t("stop_recording", "Зупинити")
                  : t("start_recording", "Записати")
              }
            >
              {isRecording ? "⏹️" : "⏺️"}
            </button>

            {/* 3. Слухати себе (З'являється після запису) */}
            {recordedBlob && (
              <button
                onClick={playRecording}
                className="text-primary hover:text-primary/80 p-2 rounded-full shadow-md border bg-card transition-colors"
                title={t("play_recording")}
                style={{ fontSize: "2.2rem", minWidth: 48 }}
                tabIndex={0}
              >
                ▶️ {/* <--- ВИПРАВЛЕНА ІКОНКА */}
              </button>
            )}
          </div>

          {/* Помилка мікрофону (якщо є) */}
          {mediaError && (
            <div className="text-destructive text-sm text-center mb-2 max-w-xs">
              {mediaError}
            </div>
          )}

          {/* Чекбокс "Показати переклад" */}
          <div className="flex items-center gap-6 mt-2">
            <label className="flex items-center cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={showTranslation}
                onChange={() => setShowTranslation((s) => !s)}
                className="accent-primary mr-2"
              />
              {t("show_translation")}
            </label>
          </div>

          {/* Прихований аудіо-плеєр */}
          {recordedBlob && (
            <audio
              ref={audioPlayerRef}
              src={URL.createObjectURL(recordedBlob)}
              style={{ display: "none" }}
            />
          )}
        </div>{" "}
        {/* Кінець div, що центрує */}
      </div>{" "}
      {/* Кінець div (flex-1 Content Area) */}
      {/* === 2. Action Area (Приклеєна до низу) === */}
      <div className="flex-shrink-0 w-full max-w-lg mx-auto">
        <button
          onClick={handleNext}
          className="w-full px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow transition-transform active:scale-[0.98] focus-ring text-lg m-4 mt-2"
        >
          {currentIdx < phrases.length - 1 ? t("next") : t("finish")}
        </button>
      </div>
    </div>
  );
}
