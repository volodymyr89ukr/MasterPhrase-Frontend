import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNounProgress } from "../../contexts/NounProgressContext";
import BackButton from "../BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { fetchWordSetsByThousand } from "../../api/nounsApi";
import { WordSetData } from "../../api/nounsApi";

export default function NounWordSetsPage() {
  const { supersetId } = useParams<{ supersetId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isSetCompleted, getSupersetProgress } = useNounProgress();

  const [wordSets, setWordSets] = useState<WordSetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supersetName, setSupersetName] = useState("");

  useEffect(() => {
    const loadWordSets = async () => {
      try {
        setLoading(true);
        const data = await fetchWordSetsByThousand(Number(supersetId));
        setWordSets(data);
        setSupersetName(
          data[0]?.word_set.split("-")[0] || `Розділ ${supersetId}`
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (supersetId) loadWordSets();
  }, [supersetId]);

  const progress = getSupersetProgress(Number(supersetId), wordSets.length);

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

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <BackButton to="/nouns" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                📘 {supersetName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("select_word_set", "Оберіть комплект для вивчення")}
              </p>
            </div>
          </div>

          {/* Прогрес */}
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{t("progress", "Прогрес")}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        <div className="max-w-5xl mx-auto">
          {wordSets.length === 0 ? (
            <EmptyState
              icon={<span className="text-6xl">📦</span>}
              title={t("no_word_sets", "Немає комплектів")}
              description={t("no_word_sets_desc", "Спробуйте пізніше")}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {wordSets.map((set, idx) => {
                const completed = isSetCompleted(Number(supersetId), set.id);
                return (
                  <Card
                    key={set.id}
                    className={`hover:shadow-lg transition-shadow cursor-pointer ${
                      completed ? "border-green-500 border-2" : ""
                    }`}
                    onClick={() =>
                      navigate(`/nouns/${supersetId}/set/${set.id}`)
                    }
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-center">
                        {t("set", "Комплект")} {idx + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground text-center mb-2">
                        18 {t("words", "слів")}
                      </div>
                      <div className="text-4xl text-center">
                        {completed ? "✅" : "▶️"}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
