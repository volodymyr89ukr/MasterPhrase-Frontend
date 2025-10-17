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
    <div className="w-screen h-screen overflow-y-auto flex flex-col bg-background">
      {/* Назва додатку окремим рядком по центру на головній */}
      {isHome && (
        <div className="w-full flex flex-col items-center mt-6 mb-2">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight text-center mb-2 select-none">
            MasterPhrase
          </h1>
          <div className="w-full flex items-center justify-between p-2 max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowLanguageSelection(true)}
                className="text-lg sm:text-xl text-muted-foreground hover:text-foreground underline font-semibold transition-colors"
                title={t("change_language_title")}
              >
                {t("change_language")}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <span className="text-foreground text-lg sm:text-xl font-semibold">
                    {user.username
                      ? t("profile_user", { username: user.username })
                      : user.email}
                  </span>
                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("user");
                      setUser(null);
                    }}
                    className="py-2 px-5 rounded-lg bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 transition-colors text-base sm:text-lg"
                  >
                    {t("logout")}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="py-2 px-5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors text-base sm:text-lg"
                >
                  {t("login")}
                </button>
              )}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
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
      {/* Роутінг сторінок */}
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
      </Routes>
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
