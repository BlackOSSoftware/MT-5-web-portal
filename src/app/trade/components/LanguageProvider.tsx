"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext<any>(null);

export function LanguageProvider({ children }: any) {
  const [language, setLanguage] = useState("english");

  useEffect(() => {
    const saved = localStorage.getItem("trade-lang");
    if (saved) setLanguage(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("trade-lang", language);

    const langMap: any = {
      english: "en",
      indonesia: "id",
      russia: "ru",
    };

    document.documentElement.lang = langMap[language];
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}


export const useLanguage = () => useContext(LanguageContext);
