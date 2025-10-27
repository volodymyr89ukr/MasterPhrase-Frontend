import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BackButton from "./BackButton";
import ExerciseBlockContainer from "./ExerciseBlockContainer";
import TextSpeechHighlighter from "./TextSpeechHighlighter";
import { useSettings } from "../contexts/SettingsContext";
import { useProgress } from "../contexts/ProgressContext";
import { useErrorPool } from "../contexts/ErrorPoolContext";

interface Thousand {
  id: number;
  name: string;
  description?: string | null;
}

interface WordSet {
  id: number;
  word_set: string;
  name?: string;
}

type WordItem = Word | string;

interface Word {
  id: number;
  word: string;
  translation?: string;
}

interface ExerciseMeta {
  id: number;
  exercise_name?: string;
  name?: string;
  title?: string;
}

interface ExerciseDetails {
  theory: string;
  data: any[];
  exercise_name?: string;
  name?: string;
  title?: string;
  error?: string;
}

interface ReadingTitle {
  id: number;
  title: string;
}

interface ReadingText {
  text: string;
  translation: string;
}

interface Language {
  id: number;
  code: string;
  name: string;
}

interface Block1Props {
  user: any;
  learningLanguage: Language | null;
  renderThousandItem?: (thousand: Thousand) => React.ReactNode;
  renderWordSetItem?: (set: WordSet) => React.ReactNode;
}

function ConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-2xl p-6 shadow-xl w-80 max-w-full">
        <h3 className="font-bold text-lg mb-4 text-center text-card-foreground">
          {t("confirm_exit_title")}
        </h3>
        <div className="mb-4 text-muted-foreground text-center">
          {t("confirm_exit_text")}
        </div>
        <div className="flex justify-end gap-4">
          <button
            className="px-4 py-2 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
            onClick={onCancel}
          >
            {t("cancel")}
          </button>
          <button
            className="px-4 py-2 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 border border-input transition-colors"
            onClick={onConfirm}
          >
            {t("exit")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Block1({
  user,
  learningLanguage,
  renderThousandItem,
  renderWordSetItem,
}: Block1Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { thousandId, setId } = useParams();
  const location = useLocation();
  const { interfaceLanguage } = useSettings();
  const { knownWordIds, toggleKnownWord, isWordKnown, knownWordIdsSet } =
    useProgress();
  const { errorPool, getErrorArray, injectErrors } = useErrorPool();
  const { poolSize, setPoolSize } = useSettings();

  // State
  const [thousands, setThousands] = useState<Thousand[]>([]);
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [readingTitles, setReadingTitles] = useState<ReadingTitle[]>([]);
  const [exercisesMeta, setExercisesMeta] = useState<ExerciseMeta[]>([]);
  const [readingText, setReadingText] = useState<ReadingText | null>(null);
  const [activeTab, setActiveTab] = useState<"words" | "reading" | "exercises">(
    "words"
  );
  const [selectedReadingId, setSelectedReadingId] = useState<number | null>(
    null
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    null
  );
  const [exerciseDetails, setExerciseDetails] =
    useState<ExerciseDetails | null>(null);
  const [loadingExerciseDetails, setLoadingExerciseDetails] =
    useState<boolean>(false);
  const [showConfirmExit, setShowConfirmExit] = useState<boolean>(false);
  const [errorSessionData, setErrorSessionData] = useState<any[] | null>(null);

  // Додаткові стани для вкладки "words"
  const [markKnownMode, setMarkKnownMode] = useState<boolean>(false);
  const [hideKnown, setHideKnown] = useState<boolean>(false);

  // Loading & error
  const [loadingThousands, setLoadingThousands] = useState<boolean>(true);
  const [loadingWordSets, setLoadingWordSets] = useState<boolean>(false);
  const [loadingWords, setLoadingWords] = useState<boolean>(false);
  const [loadingReadings, setLoadingReadings] = useState<boolean>(false);
  const [loadingExercises, setLoadingExercises] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch thousands ---
  useEffect(() => {
    if (!learningLanguage) {
      setThousands([]);
      return;
    }
    setLoadingThousands(true);
    fetch(
      `${import.meta.env.VITE_API_URL}/api/thousands?language_id=${
        learningLanguage.id
      }`
    )
      .then((r) => r.json())
      .then((data) => {
        setThousands(Array.isArray(data.data) ? data.data : []);
        setLoadingThousands(false);
      })
      .catch(() => {
        setThousands([]);
        setLoadingThousands(false);
        setError(t("error_loading_thousands"));
      });
  }, [learningLanguage, t]);

  // --- Fetch word sets for selected thousand ---
  useEffect(() => {
    if (thousandId) {
      setLoadingWordSets(true);
      fetch(
        `${import.meta.env.VITE_API_URL}/api/thousands/${thousandId}/word-sets`
      )
        .then((r) => r.json())
        .then((data) => {
          setWordSets(Array.isArray(data.data) ? data.data : []);
          setLoadingWordSets(false);
        })
        .catch(() => {
          setWordSets([]);
          setLoadingWordSets(false);
          setError(t("error_loading_word_sets"));
        });
    }
  }, [thousandId, t]);

  // --- Fetch words, readings, exercises for selected set ---
  useEffect(() => {
    if (setId && interfaceLanguage && interfaceLanguage.code) {
      setLoadingWords(true);
      setLoadingReadings(true);
      setLoadingExercises(true);

      fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/word-sets/${setId}/words?interface_language=${
          interfaceLanguage.code
        }`
      )
        .then((r) => r.json())
        .then((data) => {
          setAllWords(
            Array.isArray(data) ? data : data.words || data.data || []
          );
        })
        .catch(() => setAllWords([]))
        .finally(() => setLoadingWords(false));

      fetch(`${import.meta.env.VITE_API_URL}/api/word-sets/${setId}/texts`)
        .then((r) => r.json())
        .then((data) =>
          setReadingTitles(Array.isArray(data.data) ? data.data : [])
        )
        .catch(() => setReadingTitles([]))
        .finally(() => setLoadingReadings(false));

      fetch(`${import.meta.env.VITE_API_URL}/api/word-sets/${setId}/exercises`)
        .then((r) => r.json())
        .then((data) =>
          setExercisesMeta(Array.isArray(data.data) ? data.data : [])
        )
        .catch(() => setExercisesMeta([]))
        .finally(() => setLoadingExercises(false));
    }
  }, [setId, t, interfaceLanguage]);

  // --- Reading selection ---
  useEffect(() => {
    if (
      activeTab === "reading" &&
      readingTitles.length > 0 &&
      !selectedReadingId
    ) {
      handleSelectReading(readingTitles[0].id);
    }
    // eslint-disable-next-line
  }, [activeTab, readingTitles]);

  const handleSelectReading = async (readingId: number) => {
    setSelectedReadingId(readingId);
    setReadingText(null);
    if (readingId) {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/texts/${readingId}`
      );
      const data = await res.json();
      setReadingText(data.data || { text: "", translation: "" });
    }
  };

  // --- Exercise selection ---
  const handleSelectExercise = async (exerciseId: number) => {
    setSelectedExerciseId(exerciseId);
    setLoadingExerciseDetails(true);
    setExerciseDetails(null);

    if (exerciseId && setId && interfaceLanguage && interfaceLanguage.code) {
      try {
        const res = await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/api/word-sets/${setId}/exercises/${exerciseId}?interface_language=${
            interfaceLanguage.code
          }`
        );
        const data = await res.json();
        const rawData = Array.isArray(data?.data) ? data.data : []; // =====> (REQ 2) ВАШ КОД ІН'ЄКЦІЇ ПОМИЛОК <===== // Ін'єктуємо 6 помилок. `injectErrors` повертає [нові дані, id видалених]
        const [combinedData] = await injectErrors(rawData, 6); // =====> КІНЕЦЬ КОДУ <=====
        // Фільтрація фраз за knownWordIds (по поточній мові навчання)
        const knownSet = new Set(knownWordIds);
        const filtered = combinedData.filter((item: any) => {
          const wid = item?.word_id ?? item?.wordId ?? item?.word?.id ?? null;
          return !(typeof wid === "number" && knownSet.has(wid));
        });

        setExerciseDetails({ ...data, data: filtered });
      } catch {
        setExerciseDetails({
          error: t("failed_to_load_exercise"),
        } as ExerciseDetails);
      }
      setLoadingExerciseDetails(false);
    } else {
      setExerciseDetails({
        error: t("failed_to_load_exercise"),
      } as ExerciseDetails);
      setLoadingExerciseDetails(false);
    }
  };

  const handleRequestExitExercise = () => setShowConfirmExit(true);
  const handleCancelExitExercise = () => setShowConfirmExit(false);
  const handleConfirmExitExercise = () => {
    setShowConfirmExit(false);
    setSelectedExerciseId(null);
    setExerciseDetails(null);
    setLoadingExerciseDetails(false);
    setErrorSessionData(null);
  };

  // =====> (REQ 4) ЛОГІКА ДЛЯ РЕЖИМУ ТРЕНУВАННЯ ПОМИЛОК <=====
  if (errorSessionData) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
               {" "}
        <ExerciseBlockContainer
          exerciseData={errorSessionData}
          title={t("error_session_title", "Робота над помилками")}
          onBack={handleConfirmExitExercise} // Використовуємо існуючу функцію
          isErrorSession={true} // <-- Передаємо проп
        />
             {" "}
      </div>
    );
  } // =====> КІНЕЦЬ КОДУ <=====
  // Похідні для вкладки words
  const wordsForList = useMemo(() => {
    if (!hideKnown) return allWords;
    return allWords.filter((w) => {
      if (typeof w === "string") return true; // рядки не ховаємо
      if (typeof (w as any)?.id === "number") {
        return !isWordKnown((w as any).id);
      }
      return true;
    });
  }, [allWords, hideKnown, isWordKnown, knownWordIds]);

  // --- Render logic by route ---
  // 1. Головна: вибір тисяч
  if (!thousandId) {
    return (
      <div className="w-full h-full flex flex-col max-w-3xl mx-auto">
        {/* Фіксований хедер */}
        <div className="flex-shrink-0 p-4 pb-2">
          <h2 className="text-xl font-bold text-foreground">
            {t("select_thousand_words")}
          </h2>
        </div>

        {/* Скролована зона */}
        <div className="flex-1 overflow-y-auto px-4 pb-12 min-h-0">
          {loadingThousands ? (
            <div className="text-muted-foreground">{t("loading")}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {thousands.map((th) => (
                <div
                  key={th.id}
                  onClick={() => navigate(`/thousand/${th.id}`)}
                  className="cursor-pointer"
                >
                  {renderThousandItem ? (
                    renderThousandItem(th)
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 bg-card rounded-xl shadow border border-border hover:bg-accent transition-colors select-none p-3">
                      <div className="text-lg font-bold text-card-foreground text-center">
                        {th.name}
                      </div>
                      {th.description && (
                        <div className="text-xs text-muted-foreground text-center mt-1">
                          {th.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {error && <div className="text-destructive">{error}</div>}{" "}
          {/* =====> (REQ 3 & 4) КНОПКИ РОБОТИ З ПОМИЛКАМИ <===== */}
          {errorPool.size > 0 && (
            <div className="mt-8 p-4 bg-card rounded-xl shadow border border-border">
              <h3 className="text-lg font-bold text-center mb-3 text-foreground whitespace-nowrap">
                {t("error_pool_title", "Помилки")} ({errorPool.size})
              </h3>
              {/* =====> ЗМІНА ТУТ: Замінено класи flexbox та прибрано min-w <===== */}
              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                  onClick={() => setErrorSessionData(getErrorArray())}
                >
                  {t("error_pool_practice", "Тренувати")}
                </button>
                <button
                  className="flex-1 px-4 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors"
                  onClick={() => navigate("/review-errors")}
                >
                  {t("error_pool_review", "Переглянути")}
                </button>
              </div>
            </div>
          )}
          {/* =====> КІНЕЦЬ КОДУ <===== */}
        </div>
      </div>
    );
  }

  // 2. Вибір комплекту в тисячі
  if (thousandId && !setId) {
    return (
      <div className="w-full h-full flex flex-col max-w-3xl mx-auto">
        {/* Фіксований хедер */}
        <div className="flex-shrink-0 p-4 pb-2">
          <div className="flex items-center gap-2">
            <BackButton to="/" />
            <h2 className="text-xl font-bold text-foreground">
              {t("select_word_set")}
            </h2>
          </div>
        </div>

        {/* Скролована зона */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
          {loadingWordSets ? (
            <div className="text-muted-foreground">{t("loading")}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {wordSets.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() =>
                    navigate(`/thousand/${thousandId}/set/${ws.id}`)
                  }
                  className="cursor-pointer"
                >
                  {renderWordSetItem ? (
                    renderWordSetItem(ws)
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 bg-card rounded-xl shadow border border-border hover:bg-accent transition-colors select-none p-3">
                      <div className="text-lg font-bold text-card-foreground text-center">
                        {ws.name || ws.word_set}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {error && <div className="text-destructive">{error}</div>}
        </div>
      </div>
    );
  }

  // 3. Перегляд комплекту (слова, читання, вправи)
  if (thousandId && setId) {
    // Exercise details view
    if (selectedExerciseId && exerciseDetails) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          {loadingExerciseDetails ? (
            <div className="text-muted-foreground text-center my-6">
              {t("loading_exercise")}
            </div>
          ) : exerciseDetails.error ? (
            <div className="text-destructive">{exerciseDetails.error}</div>
          ) : (
            <ExerciseBlockContainer
              theoryText={exerciseDetails.theory}
              exerciseData={exerciseDetails.data}
              title={
                exerciseDetails.exercise_name ||
                exerciseDetails.name ||
                exerciseDetails.title
              }
              onBack={handleRequestExitExercise}
              isErrorSession={false}
            />
          )}
          <ConfirmModal
            open={showConfirmExit}
            onCancel={handleCancelExitExercise}
            onConfirm={handleConfirmExitExercise}
          />
        </div>
      );
    }

    // --- Tabs unified container ---
    return (
      <div className="w-full h-full flex flex-col max-w-3xl min-w-[320px] mx-auto overflow-hidden">
        {/* Фіксований хедер з вкладками */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <BackButton to={`/thousand/${thousandId}`} />
            <div className="flex gap-1 sm:gap-2 bg-secondary rounded-lg p-1 shadow-sm">
              {(["words", "reading", "exercises"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`px-3 py-1 rounded-md text-base font-semibold transition-colors duration-200
                    ${
                      activeTab === tab
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-transparent text-secondary-foreground hover:bg-accent"
                    }
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  `}
                  style={{ minWidth: 0 }}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "words"
                    ? t("tab_all_words")
                    : tab === "reading"
                    ? t("tab_reading")
                    : t("tab_exercises")}
                </button>
              ))}
              {/* </button>
              ))} */}
            </div>
          </div>
        </div>

        {/* Скролована зона для контенту вкладок */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {activeTab === "words" && (
            <div className="flex-1 flex flex-col overflow-hidden px-4">
              <div className="bg-card rounded-xl shadow flex flex-col overflow-hidden">
                {/* Фіксована панель керування */}
                <div className="flex-shrink-0 p-4 pb-3 border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-center sm:text-left text-sm text-muted-foreground">
                      {t(
                        "select_known_words",
                        "Обери слова, які ти вже вивчив"
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setMarkKnownMode((v) => !v)}
                        className={`px-3 py-1 rounded-lg text-sm font-semibold border shadow-sm transition-colors
                          ${
                            markKnownMode
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
                          }`}
                        title={t(
                          "toggle_mark_known_mode",
                          'Перемкнути режим "Позначати відомі"'
                        )}
                      >
                        {markKnownMode
                          ? t("mark_known_on", "Позначати відомі: Увімкн.")
                          : t("mark_known_off", "Позначати відомі: Вимкн.")}
                      </button>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={hideKnown}
                          onChange={(e) => setHideKnown(e.target.checked)}
                        />
                        <span className="text-foreground">
                          {t("hide_known", "Сховати відомі")}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Скролована зона зі словами */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  {loadingWords ? (
                    <div className="text-muted-foreground text-center">
                      {t("loading")}
                    </div>
                  ) : (
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {wordsForList.map((w: any, idx) => {
                        const id = typeof w === "object" ? w.id : undefined;
                        const known =
                          typeof id === "number" ? isWordKnown(id) : false;
                        const clickable =
                          markKnownMode && typeof id === "number";
                        return (
                          <li
                            key={id ?? idx}
                            onClick={() => {
                              if (clickable) toggleKnownWord(id as number);
                            }}
                            className={[
                              "px-3 py-2 rounded text-center shadow-sm border flex flex-col items-center justify-center min-h-[56px] select-none transition-colors",
                              known
                                ? "bg-muted text-muted-foreground border-border opacity-80"
                                : "bg-card text-card-foreground border-border",
                              clickable
                                ? "cursor-pointer hover:bg-accent"
                                : "cursor-default",
                            ].join(" ")}
                            title={
                              typeof id === "number"
                                ? known
                                  ? t(
                                      "click_to_mark_unknown",
                                      "Натисни, щоб повернути у навчання"
                                    )
                                  : t(
                                      "click_to_mark_known",
                                      "Натисни, щоб позначити як відоме"
                                    )
                                : t("no_id_for_word", "ID слова відсутній")
                            }
                          >
                            {typeof w === "string" ? (
                              <span className="text-lg font-semibold leading-tight">
                                {w}
                              </span>
                            ) : (
                              <>
                                <span className="text-lg font-bold leading-tight">
                                  {w.word}
                                </span>
                                {w.translation && (
                                  <span className="text-base text-primary opacity-80 mt-0.5 leading-tight">
                                    {w.translation}
                                  </span>
                                )}
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === "reading" && (
            <div className="flex-1 flex flex-col overflow-hidden px-4">
              {loadingReadings ? (
                <div className="text-muted-foreground text-center bg-card rounded-xl shadow p-4">
                  {t("loading")}
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-card rounded-xl shadow">
                  {/* Фіксовані кнопки вибору тексту */}
                  {readingTitles.length > 0 && (
                    <div className="flex-shrink-0 p-4 pb-3 border-b border-border">
                      <div className="flex flex-wrap gap-2">
                        {readingTitles.map((rt) => (
                          <button
                            key={rt.id}
                            onClick={() => handleSelectReading(rt.id)}
                            className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors shadow-sm ${
                              selectedReadingId === rt.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-card-foreground border-border hover:bg-accent hover:border-accent"
                            }`}
                          >
                            {rt.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {readingTitles.length === 0 && (
                    <div className="text-muted-foreground text-center p-8">
                      {t("no_texts_for_set")}
                    </div>
                  )}

                  {/* Скролована зона з текстом */}
                  {selectedReadingId && readingText && (
                    <div className="flex-1 overflow-y-auto p-4 min-h-0">
                      <TextSpeechHighlighter
                        text={readingText.text}
                        translation={readingText.translation}
                      />
                    </div>
                  )}

                  {selectedReadingId &&
                    !readingText &&
                    readingTitles.length > 0 && (
                      <div className="text-muted-foreground text-center p-8">
                        {t("loading_text")}
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
          {activeTab === "exercises" && (
            <div className="flex-1 flex flex-col overflow-hidden px-4">
              <div className="bg-card rounded-xl shadow flex flex-col overflow-hidden">
                {/* Фіксована панель налаштувань poolSize */}
                <div className="flex-shrink-0 p-4 pb-3 border-b border-border">
                  <div className="p-3 bg-primary/10 rounded-lg border border-border">
                    <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {t(
                          "pool_size_setting",
                          "Кількість фраз для переходу між блоками:"
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        {[3, 4, 5, 6].map((size) => (
                          <button
                            key={size}
                            onClick={() => setPoolSize(size)}
                            className={`px-4 py-2 rounded-lg font-semibold border-2 transition-colors ${
                              poolSize === size
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-card-foreground border-border hover:bg-accent"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Скролована зона зі списком вправ */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  {loadingExercises ? (
                    <div className="text-muted-foreground text-center">
                      {t("loading")}
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {exercisesMeta.map((ex) => (
                        <li
                          key={ex.id}
                          className="px-4 py-2 rounded border border-border bg-primary/10 text-foreground shadow text-left cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelectExercise(ex.id)}
                        >
                          {ex.exercise_name || ex.name || ex.title || ex.id}
                        </li>
                      ))}
                      {exercisesMeta.length === 0 && (
                        <div className="text-muted-foreground text-center my-8">
                          {t("no_exercises_for_set")}
                        </div>
                      )}
                    </ul>
                  )}
                  {loadingExerciseDetails && (
                    <div className="text-muted-foreground text-center my-6">
                      {t("loading_exercise")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {error && <div className="text-destructive px-4 py-2">{error}</div>}
        </div>
      </div>
    );
  }

  return null;
}
