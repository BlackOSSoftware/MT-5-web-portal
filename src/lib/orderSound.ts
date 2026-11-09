"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "trade-order-sound";
const CHANGE_EVENT = "trade-order-sound-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getSnapshot = () => localStorage.getItem(STORAGE_KEY) !== "0";
const getServerSnapshot = () => true;

/** Order sound on/off — plays only when a trade position is taken. */
export function useOrderSound() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setEnabled = useCallback((next: boolean) => {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [enabled, setEnabled] as const;
}

export function isOrderSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "0";
}

const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(src: string): HTMLAudioElement {
  let audio = audioCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.volume = 0.8;
    audioCache.set(src, audio);
  }
  return audio;
}

/** Play the order sound only when the user has not muted it. */
export function playOrderSound(kind: "success" | "error") {
  if (!isOrderSoundEnabled()) return;
  const audio = getAudio(kind === "success" ? "/sound/success.mp3" : "/sound/error.mp3");
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}
