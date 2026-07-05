import browser from "webextension-polyfill";
import type { UserSettings } from "@cf-studio/shared";

const SETTINGS_KEY = "cf_studio_settings";

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  layoutPreset: "50/50",
  pinnedLanguages: ["GNU G++23 14.2 (64 bit, msys2)"],
  proSuggestions: false,
};

export async function getSetting<K extends keyof UserSettings>(
  key: K,
): Promise<UserSettings[K]> {
  const result = await browser.storage.local.get(SETTINGS_KEY);
  const settings = { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
  return settings[key];
}

export async function getAllSettings(): Promise<UserSettings> {
  const result = await browser.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
}

export async function setSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K],
): Promise<void> {
  const current = await getAllSettings();
  const updated = { ...current, [key]: value };
  await browser.storage.local.set({ [SETTINGS_KEY]: updated });
}
