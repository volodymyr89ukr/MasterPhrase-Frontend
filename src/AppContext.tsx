import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";
import { ProgressProvider, useProgress } from "./contexts/ProgressContext";

// Re-export hooks для зворотної сумісності
export { useAuth } from "./contexts/AuthContext";
export { useSettings } from "./contexts/SettingsContext";
export { useProgress } from "./contexts/ProgressContext";
export type { Language } from "./contexts/SettingsContext";

// ✅ Композиція всіх контекстів
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ProgressProvider>{children}</ProgressProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

// Legacy hook для поступової міграції (deprecated)
export function useAppContext() {
  console.warn(
    "useAppContext is deprecated. Use useAuth/useSettings/useProgress instead."
  );
  const auth = useAuth();
  const settings = useSettings();
  const progress = useProgress();
  return { ...auth, ...settings, ...progress };
}
