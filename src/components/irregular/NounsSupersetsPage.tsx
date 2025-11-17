import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../contexts/SettingsContext";
import { useNounProgress } from "../../contexts/NounProgressContext";
import BackButton from "../BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { fetchThousands } from "../../api/nounsApi";
import { NounSuperset } from "./types";

export default function NounsSupersetsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { learningLanguage } = useSettings();
  const { getSupersetProgress } = useNounProgress();

  const [supersets, setSupersets] = useState<NounSuperset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSupersets = async () => {
      try {
        setLoading(true);
        const languageId = learningLanguage?.id || 1;
        const data = await fetchThousands(languageId);

        const mapped: NounSuperset[] = data.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description || undefined,
          totalWords: 180,
          totalSets: 10,
          progress: getSupersetProgress(t.id, 10),
        }));

        setSupersets(mapped);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSupersets();
  }, [learningLanguage, getSupersetProgress]);

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
          <div className="flex items-center gap-3 mb-2">
            <BackButton to="/irregular" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                📘 {t("nouns_supersets", "Артиклі і множина іменників")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t(
                  "nouns_supersets_desc",
                  "Оберіть розділ для вивчення (по 180 слів)"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {supersets.length === 0 ? (
            <EmptyState
              icon={<span className="text-6xl">📦</span>}
              title={t("no_supersets", "Немає доступних розділів")}
              description={t("no_supersets_desc", "Спробуйте пізніше")}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {supersets.map((superset) => (
                <Card
                  key={superset.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/nouns/${superset.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{superset.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {superset.description ||
                        `${superset.totalWords} слів у ${superset.totalSets} комплектах`}
                    </p>

                    {/* Прогрес */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{t("progress", "Прогрес")}</span>
                        <span>{superset.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${superset.progress}%` }}
                        />
                      </div>
                    </div>

                    <Button className="w-full" size="sm">
                      ▶️ {t("start", "Почати")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
