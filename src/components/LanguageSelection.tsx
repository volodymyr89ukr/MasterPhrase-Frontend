import React, { useState, useEffect } from "react";
import { useSettings, Language } from "../contexts/SettingsContext";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";

interface LanguageSelectionProps {
  onClose?: () => void;
}

export default function LanguageSelection({ onClose }: LanguageSelectionProps) {
  const { t } = useTranslation();

  const { user } = useAuth();
  const {
    interfaceLanguage,
    setInterfaceLanguage,
    learningLanguage,
    setLearningLanguage,
  } = useSettings();

  const [interfaceLanguages, setInterfaceLanguages] = useState<Language[]>([]);
  const [learningLanguages, setLearningLanguages] = useState<Language[]>([]);

  const [selectedInterfaceCode, setSelectedInterfaceCode] = useState(
    interfaceLanguage?.code || ""
  );
  const [selectedLearningId, setSelectedLearningId] = useState<number | null>(
    learningLanguage?.id || null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLanguages() {
      try {
        setLoading(true);
        setError(null);

        const interfaceRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/languages`
        );
        const interfaceData = await interfaceRes.json();

        const learningRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/learning-languages`
        );
        const learningData = await learningRes.json();

        if (interfaceData.success && learningData.success) {
          setInterfaceLanguages(interfaceData.data);
          setLearningLanguages(learningData.data);

          if (!selectedInterfaceCode && interfaceData.data.length > 0)
            setSelectedInterfaceCode(interfaceData.data[0].code);
          if (!selectedLearningId && learningData.data.length > 0)
            setSelectedLearningId(learningData.data[0].id);
        } else {
          setError(t("error_loading_languages"));
        }
      } catch (err) {
        setError(t("error_loading_languages"));
      } finally {
        setLoading(false);
      }
    }

    fetchLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    const interfaceLang = interfaceLanguages.find(
      (l) => l.code === selectedInterfaceCode
    );
    const learningLang = learningLanguages.find(
      (l) => l.id === selectedLearningId
    );

    if (interfaceLang && learningLang) {
      setInterfaceLanguage(interfaceLang);
      setLearningLanguage(learningLang);

      localStorage.setItem("interfaceLanguage", JSON.stringify(interfaceLang));
      localStorage.setItem("learningLanguage", JSON.stringify(learningLang));
      localStorage.setItem("interfaceLanguageCode", interfaceLang.code);
      localStorage.setItem("learningLanguageId", learningLang.id.toString());

      if (user?.id) {
        try {
          setLoading(true);
          setError(null);
          setSuccess(null);

          const token = localStorage.getItem("token");
          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/api/users/${
              user.id
            }/languages-settings`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                interface_language: interfaceLang.code,
                learning_language: learningLang.code,
              }),
            }
          );

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || t("error_saving_settings"));
          }

          setSuccess(t("settings_saved"));
        } catch (err: any) {
          setError(err?.message || t("error_saving_settings"));
          return;
        } finally {
          setLoading(false);
        }
      }

      if (onClose) onClose();
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {t("loading_languages")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        {error}
        <button
          className="ml-4 px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          onClick={() => window.location.reload()}
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded shadow space-y-6">
      <h2 className="text-xl font-semibold text-center mb-4 text-card-foreground">
        {t("language_selection_title")}
      </h2>

      <div>
        <label
          htmlFor="interface-language"
          className="block mb-2 font-medium text-foreground"
        >
          {t("interface_language_label")}
        </label>
        <select
          id="interface-language"
          value={selectedInterfaceCode}
          onChange={(e) => setSelectedInterfaceCode(e.target.value)}
          className="w-full p-2 border border-input rounded bg-card text-foreground focus:border-ring focus:ring-2 focus:ring-ring transition-colors"
        >
          {interfaceLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="learning-language"
          className="block mb-2 font-medium text-foreground"
        >
          {t("learning_language_label")}
        </label>
        <select
          id="learning-language"
          value={selectedLearningId ?? undefined}
          onChange={(e) => setSelectedLearningId(Number(e.target.value))}
          className="w-full p-2 border border-input rounded bg-card text-foreground focus:border-ring focus:ring-2 focus:ring-ring transition-colors"
        >
          {learningLanguages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <button
        disabled={!selectedInterfaceCode || !selectedLearningId}
        onClick={handleConfirm}
        className="w-full py-2 bg-primary text-primary-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
      >
        {t("continue")}
      </button>
      {success && <div className="text-success text-center">{success}</div>}
      {onClose && (
        <button
          onClick={onClose}
          className="w-full mt-2 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
        >
          {t("cancel")}
        </button>
      )}
    </div>
  );
}
