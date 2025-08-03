import React from "react";
import { useTranslation } from "react-i18next";
import { User } from "../types";

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  onShowLanguage: () => void;
  onLogout: () => void;
  user: User | null;
}

const MenuDrawer: React.FC<MenuDrawerProps> = ({
  open,
  onClose,
  onShowLanguage,
  onLogout,
  user,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/40 flex ${
        open ? "" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className="bg-white w-64 h-full shadow-xl p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold text-lg mb-4">MasterPhrase</div>
        <button
          className="mb-2 py-2 px-4 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition"
          onClick={onShowLanguage}
        >
          {t("change_language")}
        </button>
        {user && (
          <div className="mb-2 text-gray-700 text-sm">
            {user.username
              ? t("profile_user", { username: user.username })
              : user.email}
          </div>
        )}
        <button
          className="py-2 px-4 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition"
          onClick={onLogout}
        >
          {t("logout")}
        </button>
        <button
          className="mt-auto text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
};

export default MenuDrawer;
