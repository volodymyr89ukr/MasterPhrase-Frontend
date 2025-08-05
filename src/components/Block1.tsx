import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BackButton from "./BackButton";
import ExerciseBlockContainer from "./ExerciseBlockContainer";
import TextSpeechHighlighter from "./TextSpeechHighlighter";

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
      <div className="bg-white rounded-2xl p-6 shadow-xl w-80 max-w-full">
        <h3 className="font-bold text-lg mb-4 text-center">
          {t("confirm_exit_title")}
        </h3>
        <div className="mb-4 text-gray-700 text-center">
          {t("confirm_exit_text")}
        </div>
        <div className="flex justify-end gap-4">
          <button
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            onClick={onCancel}
          >
            {t("cancel")}
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 border border-blue-200"
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
    if (setId) {
      setLoadingWords(true);
      setLoadingReadings(true);
      setLoadingExercises(true);

      fetch(`${import.meta.env.VITE_API_URL}/api/word-sets/${setId}/words`)
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
  }, [setId, t]);

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
    if (exerciseId && setId) {
      try {
        const res = await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/api/word-sets/${setId}/exercises/${exerciseId}`
        );
        const data = await res.json();
        setExerciseDetails(data);
      } catch {
        setExerciseDetails({
          error: t("failed_to_load_exercise"),
        } as ExerciseDetails);
      }
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
  };

  // --- Render logic by route ---
  // 1. Головна: вибір тисяч
  if (!thousandId) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-4">{t("select_thousand")}</h2>
        {loadingThousands ? (
          <div>{t("loading")}</div>
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
                  <div className="flex flex-col items-center justify-center h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 bg-white rounded-xl shadow border hover:bg-blue-100 transition select-none p-3">
                    <div className="text-lg font-bold text-blue-700 text-center">
                      {th.name}
                    </div>
                    {th.description && (
                      <div className="text-xs text-gray-500 text-center mt-1">
                        {th.description}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {error && <div className="text-red-500">{error}</div>}
      </div>
    );
  }

  // 2. Вибір комплекту в тисячі
  if (thousandId && !setId) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <BackButton to="/" />
          <h2 className="text-xl font-bold">{t("select_word_set")}</h2>
        </div>
        {loadingWordSets ? (
          <div>{t("loading")}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {wordSets.map((ws) => (
              <div
                key={ws.id}
                onClick={() => navigate(`/thousand/${thousandId}/set/${ws.id}`)}
                className="cursor-pointer"
              >
                {renderWordSetItem ? (
                  renderWordSetItem(ws)
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 bg-white rounded-xl shadow border hover:bg-blue-100 transition select-none p-3">
                    <div className="text-lg font-bold text-blue-700 text-center">
                      {ws.name || ws.word_set}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {error && <div className="text-red-500">{error}</div>}
      </div>
    );
  }

  // 3. Перегляд комплекту (слова, читання, вправи)
  if (thousandId && setId) {
    // Exercise details view
    if (selectedExerciseId && exerciseDetails) {
      return (
        <div className="p-2 sm:p-4 w-full max-w-3xl min-w-[360px] mx-auto flex flex-col min-h-[60vh] justify-between">
          <div className="flex justify-end mb-6">
            <button
              onClick={handleRequestExitExercise}
              className="px-3 py-2 rounded-xl bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 border border-blue-200 shadow text-sm"
            >
              {t("finish_exercise")}
            </button>
          </div>
          <div className="flex-1">
            {loadingExerciseDetails ? (
              <div className="text-gray-400 text-center my-6">
                {t("loading_exercise")}
              </div>
            ) : exerciseDetails.error ? (
              <div className="text-red-500">{exerciseDetails.error}</div>
            ) : (
              <ExerciseBlockContainer
                theoryText={exerciseDetails.theory}
                exerciseData={exerciseDetails.data}
                title={
                  exerciseDetails.exercise_name ||
                  exerciseDetails.name ||
                  exerciseDetails.title
                }
              />
            )}
          </div>
          <ConfirmModal
            open={showConfirmExit}
            onCancel={handleCancelExitExercise}
            onConfirm={handleConfirmExitExercise}
          />
        </div>
      );
    }

    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <BackButton to={`/thousand/${thousandId}`} />
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "words" ? "bg-blue-200" : "bg-gray-100"
              }`}
              onClick={() => setActiveTab("words")}
            >
              {t("tab_all_words")}
            </button>
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "reading" ? "bg-blue-200" : "bg-gray-100"
              }`}
              onClick={() => setActiveTab("reading")}
            >
              {t("tab_reading")}
            </button>
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "exercises" ? "bg-blue-200" : "bg-gray-100"
              }`}
              onClick={() => setActiveTab("exercises")}
            >
              {t("tab_exercises")}
            </button>
          </div>
        </div>
        {/* Tabs content */}
        {activeTab === "words" && (
          <div>
            {loadingWords ? (
              t("loading")
            ) : (
              <ul>
                {allWords.map((w: any, idx) => (
                  <li key={w.id || idx}>
                    {typeof w === "string" ? w : w.word}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {activeTab === "reading" && (
          <div>
            {loadingReadings ? (
              t("loading")
            ) : (
              <>
                {readingTitles.length > 0 ? (
                  <div className="mb-4 w-full relative">
                    <select
                      value={selectedReadingId || readingTitles[0].id}
                      onChange={(e) =>
                        handleSelectReading(Number(e.target.value))
                      }
                      className="block w-full p-2 pr-10 rounded border text-base bg-white appearance-none focus:outline-none"
                      style={{
                        minWidth: 0,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {readingTitles.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.title}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-center my-8">
                    {t("no_texts_for_set")}
                  </div>
                )}

                {selectedReadingId && readingText ? (
                  <div className="my-6">
                    <TextSpeechHighlighter
                      text={readingText.text}
                      translation={readingText.translation}
                    />
                  </div>
                ) : readingTitles.length > 0 ? (
                  <div className="text-gray-400 text-center my-8">
                    {t("loading_text")}
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
        {activeTab === "exercises" && (
          <div>
            {loadingExercises ? (
              t("loading")
            ) : (
              <ul className="flex flex-col gap-2">
                {exercisesMeta.map((ex) => (
                  <li
                    key={ex.id}
                    className="px-4 py-2 rounded border bg-white shadow text-left cursor-pointer hover:bg-blue-50"
                    onClick={() => handleSelectExercise(ex.id)}
                  >
                    {ex.exercise_name || ex.name || ex.title || ex.id}
                  </li>
                ))}
                {exercisesMeta.length === 0 && (
                  <div className="text-gray-400 text-center my-8">
                    {t("no_exercises_for_set")}
                  </div>
                )}
              </ul>
            )}
            {loadingExerciseDetails && (
              <div className="text-gray-400 text-center my-6">
                {t("loading_exercise")}
              </div>
            )}
          </div>
        )}
        {error && <div className="text-red-500">{error}</div>}
      </div>
    );
  }

  return null;
}
