import React, { useState, useEffect } from "react";
import Block1 from "./components/Block1";
import LoginModal from "./components/LoginModal";
import LanguageSelection from "./components/LanguageSelection";
import { AppProvider } from "./AppContext";
import { useAuth } from "./contexts/AuthContext";
import { useSettings } from "./contexts/SettingsContext";
import { User } from "./types";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { preloadTTS, initTTS } from "./utils/ttsUtils";
import { useTheme } from "./contexts/ThemeContext";
import ErrorReviewScreen from "./components/ErrorReviewScreen";

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [showLogin, setShowLogin] = useState(false);
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);
  const { user, setUser } = useAuth();
  const {
    learningLanguage,
    setLearningLanguage,
    interfaceLanguage,
    setInterfaceLanguage,
  } = useSettings();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (token && u) setUser(JSON.parse(u));

    // Відновлення мов з localStorage
    const savedInterfaceLang =
      localStorage.getItem("interfaceLanguage") ||
      localStorage.getItem("interfaceLanguageCode");
    const savedLearningLang =
      localStorage.getItem("learningLanguage") ||
      localStorage.getItem("learningLanguageId");

    if (savedInterfaceLang) {
      try {
        setInterfaceLanguage(
          typeof savedInterfaceLang === "string" &&
            savedInterfaceLang.startsWith("{")
            ? JSON.parse(savedInterfaceLang)
            : { code: savedInterfaceLang, id: 0, name: "" }
        );
      } catch {
        setInterfaceLanguage({ code: savedInterfaceLang, id: 0, name: "" });
      }
    }
    if (savedLearningLang) {
      try {
        setLearningLanguage(
          typeof savedLearningLang === "string" &&
            savedLearningLang.startsWith("{")
            ? JSON.parse(savedLearningLang)
            : { id: Number(savedLearningLang), code: "", name: "" }
        );
      } catch {
        setLearningLanguage({
          id: Number(savedLearningLang),
          code: "",
          name: "",
        });
      }
    }
    // eslint-disable-next-line
  }, []);

  // --- TTS preload для мов ---
  useEffect(() => {
    if (learningLanguage?.code) {
      preloadTTS(learningLanguage.code);
    }
    if (interfaceLanguage?.code) {
      preloadTTS(interfaceLanguage.code);
    }
  }, [learningLanguage?.code, interfaceLanguage?.code]);

  // --- TTS warm-up після першої взаємодії ---
  useEffect(() => {
    let done = false;
    const handler = async () => {
      if (done) return;
      done = true;
      if (learningLanguage?.code) {
        await initTTS(learningLanguage.code);
      }
      if (
        interfaceLanguage?.code &&
        interfaceLanguage.code !== learningLanguage?.code
      ) {
        await initTTS(interfaceLanguage.code);
      }
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [learningLanguage?.code, interfaceLanguage?.code]);

  const handleRegisterSuccess = async (newUser: User) => {
    setUser(newUser);

    const savedInterfaceLang =
      localStorage.getItem("interfaceLanguage") ||
      localStorage.getItem("interfaceLanguageCode");
    const savedLearningLang =
      localStorage.getItem("learningLanguage") ||
      localStorage.getItem("learningLanguageId");

    if (savedInterfaceLang && savedLearningLang) {
      let interface_language = "";
      let learning_language = "";
      try {
        const parsedInterface = savedInterfaceLang.startsWith("{")
          ? JSON.parse(savedInterfaceLang)
          : { code: savedInterfaceLang };
        interface_language = parsedInterface.code || savedInterfaceLang;
      } catch {
        interface_language = savedInterfaceLang;
      }
      try {
        const parsedLearning = savedLearningLang.startsWith("{")
          ? JSON.parse(savedLearningLang)
          : { code: "", id: Number(savedLearningLang) };
        learning_language =
          parsedLearning.code ||
          parsedLearning.id?.toString() ||
          savedLearningLang;
      } catch {
        learning_language = savedLearningLang;
      }

      const token = localStorage.getItem("token");
      await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/${
          newUser.id
        }/languages-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            interface_language,
            learning_language,
          }),
        }
      );
    }
  };

  // --- Показати вибір мови, якщо не обрано ---
  if (!interfaceLanguage || !learningLanguage || showLanguageSelection) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <LanguageSelection onClose={() => setShowLanguageSelection(false)} />
      </div>
    );
  }

  // --- Визначаємо, чи показувати TopBar ---
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="app-viewport w-screen h-screen overflow-hidden flex flex-col bg-background">
      {/* Фіксований хедер на головній */}
      {isHome && (
        <div className="flex-shrink-0 w-full">
          <div className="w-full flex items-center justify-between p-3 sm:p-4 max-w-3xl mx-auto mt-2 mb-2">
            {/* 1. Логотип (Зліва) */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight select-none">
              <span className="sm:hidden">MP</span>
              <span className="hidden sm:inline">MasterPhrase</span>
            </h1>

            {/* 2. Елементи керування (Справа) */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Кнопка Мови */}
              <button
                onClick={() => setShowLanguageSelection(true)}
                className="flex items-center gap-1.5 text-base sm:text-lg text-muted-foreground hover:text-foreground font-semibold transition-colors focus-ring"
                title={t("change_language_title")}
              >
                <span>🌐</span>
                <span className="uppercase">
                  {interfaceLanguage?.code || "UA"}
                </span>
              </button>

              {/* Перемикач теми */}
              <button
                onClick={toggleTheme}
                className="text-base sm:text-lg font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent focus-ring"
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {theme === "dark" ? "Світла" : "Темна"}
              </button>

              {/* Блок Входу / Профілю */}
              {user ? (
                <>
                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("user");
                      setUser(null);
                    }}
                    className="flex items-center justify-center h-10 w-10 sm:h-auto sm:w-auto sm:gap-1.5 sm:py-2 sm:px-4 rounded-lg border border-border bg-transparent text-foreground hover:bg-accent transition-colors text-base sm:text-lg font-bold focus-ring"
                    title={t("logout")}
                  >
                    <span className="hidden sm:inline">{t("logout")}</span>
                    <span className="sm:hidden text-xl">🚪</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center justify-center h-10 w-10 sm:h-auto sm:w-auto sm:gap-1.5 sm:py-2 sm:px-4 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors text-base sm:text-lg font-bold focus-ring"
                  title={t("login")}
                >
                  <span className="hidden sm:inline">{t("login")}</span>
                  <span className="sm:hidden text-xl">👤</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальне вікно */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={handleRegisterSuccess}
      />

      {/* Скролована зона для роутів */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Routes>
          <Route
            path="/"
            element={
              <Block1
                user={user}
                learningLanguage={learningLanguage}
                // Кастомний рендер тисяч
                renderThousandItem={(thousand) => (
                  <div className="flex flex-col items-center justify-center h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 bg-card rounded-xl shadow border border-border hover:bg-accent transition-colors cursor-pointer select-none p-3">
                    <div className="text-lg font-bold text-card-foreground text-center">
                      {thousand.name}
                    </div>
                    {thousand.description && (
                      <div className="text-xs text-muted-foreground text-center mt-1">
                        {thousand.description}
                      </div>
                    )}
                  </div>
                )}
                // Кастомний рендер комплектів
                renderWordSetItem={(set) => (
                  <div className="flex flex-col items-center justify-center h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 bg-card rounded-xl shadow border border-border hover:bg-accent transition-colors cursor-pointer select-none p-3">
                    <div className="text-lg font-bold text-card-foreground text-center">
                      {set.word_set || set.name || `Set #${set.id}`}
                    </div>
                  </div>
                )}
              />
            }
          />
          <Route
            path="/thousand/:thousandId"
            element={
              <Block1
                user={user}
                learningLanguage={learningLanguage}
                renderWordSetItem={(set) => (
                  <div className="flex flex-col items-center justify-center h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 bg-card rounded-xl shadow border border-border hover:bg-accent transition-colors cursor-pointer select-none p-3">
                    <div className="text-lg font-bold text-card-foreground text-center">
                      {set.word_set || set.name || `Set #${set.id}`}
                    </div>
                  </div>
                )}
              />
            }
          />
          <Route
            path="/thousand/:thousandId/set/:setId"
            element={<Block1 user={user} learningLanguage={learningLanguage} />}
          />
          {/* =====> (REQ 3) ВАШ НОВИЙ РОУТ <===== */}
          <Route path="/review-errors" element={<ErrorReviewScreen />} />
          {/* =====> КІНЕЦЬ КОДУ <===== */}
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  );
}
