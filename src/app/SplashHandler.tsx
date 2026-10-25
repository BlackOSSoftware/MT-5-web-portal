"use client";

import { useEffect } from "react";
import { SplashScreen } from "@capacitor/splash-screen";

export default function SplashHandler() {
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return null;
}
