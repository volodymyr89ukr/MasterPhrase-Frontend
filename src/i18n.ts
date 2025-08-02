import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Додаємо всі ваші мови тут
import en from "../public/locales/en/translation.json";
import de from "../public/locales/de/translation.json";
import uk from "../public/locales/uk/translation.json";
import ru from "../public/locales/ru/translation.json";
import es from "../public/locales/es/translation.json";
import fr from "../public/locales/fr/translation.json";
import it from "../public/locales/it/translation.json";
import pt from "../public/locales/pt/translation.json";
import tr from "../public/locales/tr/translation.json";
import ar from "../public/locales/ar/translation.json";
import pl from "../public/locales/pl/translation.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    uk: { translation: uk },
    ru: { translation: ru },
    es: { translation: es },
    fr: { translation: fr },
    it: { translation: it },
    pt: { translation: pt },
    tr: { translation: tr },
    ar: { translation: ar },
    pl: { translation: pl },
  },
  lng: "en", // мова за замовчуванням
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  debug: false,
});

export default i18n;
