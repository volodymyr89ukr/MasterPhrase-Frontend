import React, { useState, useEffect } from "react";
import Block1 from "./components/Block1";
import LoginModal from "./components/LoginModal";
import LanguageSelection from "./components/LanguageSelection";
import { AppProvider, useAppContext } from "./AppContext";
import { User } from "./types";
import { useTranslation } from "react-i18next";
import MenuDrawer from "./components/MenuDrawer";
import TopBar from "./components/TopBar";

// --- Основний контент ---
function AppContent() {
  const { t } = useTranslation();
  const [showLogin, setShowLogin] = useState(false);
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    user,
    setUser,
    learningLanguage,
    setLearningLanguage,
    interfaceLanguage,
    setInterfaceLanguage,
  } = useAppContext();

  // --- Стан навігації ---
  const [page, setPage] = useState<"thousands" | "sets" | "setDetails">(
    "thousands"
  );
  const [selectedThousand, setSelectedThousand] = useState<any>(null);
  const [selectedSet, setSelectedSet] = useState<any>(null);

  // --- Ініціалізація з localStorage ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (token && u) setUser(JSON.parse(u));

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

  // --- Після реєстрації/логіну ---
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

  // --- Глобальний хедер тільки на головній сторінці ---
  const showGlobalHeader = page === "thousands";

  // --- Обробка виходу ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setDrawerOpen(false);
  };

  // --- Вибір тисячі, комплекту, повернення назад ---
  const handleSelectThousand = (thousand: any) => {
    setSelectedThousand(thousand);
    setPage("sets");
  };
  const handleSelectSet = (set: any) => {
    setSelectedSet(set);
    setPage("setDetails");
  };
  const handleBackFromSet = () => {
    setSelectedSet(null);
    setPage("sets");
  };
  const handleBackFromSets = () => {
    setSelectedThousand(null);
    setPage("thousands");
  };

  // --- Якщо не вибрано мову ---
  if (!interfaceLanguage || !learningLanguage || showLanguageSelection) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <LanguageSelection onClose={() => setShowLanguageSelection(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-blue-50">
      {/* Глобальний Header тільки на головній сторінці */}
      {showGlobalHeader && (
        <div className="w-full flex items-center justify-between p-2 max-w-3xl mx-auto">
          <div className="font-bold text-lg text-blue-700 flex items-center gap-4">
            MasterPhrase
            <button
              onClick={() => setShowLanguageSelection(true)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              title={t("change_language_title")}
            >
              {t("change_language")}
            </button>
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-gray-700 text-sm">
                {user.username
                  ? t("profile_user", { username: user.username })
                  : user.email}
              </span>
              <button
                onClick={handleLogout}
                className="py-1 px-3 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition text-xs"
              >
                {t("logout")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="py-1 px-3 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition text-xs"
            >
              {t("login")}
            </button>
          )}
        </div>
      )}

      {/* TopBar для вкладених сторінок */}
      {!showGlobalHeader && (
        <TopBar
          title={
            page === "sets"
              ? t("choose_set_title")
              : page === "setDetails"
              ? selectedSet?.name || t("set")
              : ""
          }
          onBack={
            page === "sets"
              ? handleBackFromSets
              : page === "setDetails"
              ? handleBackFromSet
              : undefined
          }
          onMenu={() => setDrawerOpen(true)}
        />
      )}

      {/* Drawer/Menu */}
      <MenuDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onShowLanguage={() => {
          setDrawerOpen(false);
          setShowLanguageSelection(true);
        }}
        onLogout={handleLogout}
        user={user}
      />

      {/* Модальне вікно логіну */}
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={handleRegisterSuccess}
      />
      <></>

      {/* Головна частина: Block1 керує навігацією */}
      <Block1
        user={user}
        learningLanguage={learningLanguage}
        page={page}
        onSelectThousand={handleSelectThousand}
        onSelectSet={handleSelectSet}
        selectedThousand={selectedThousand}
        selectedSet={selectedSet}
        onBackFromSet={handleBackFromSet}
        onBackFromSets={handleBackFromSets}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
