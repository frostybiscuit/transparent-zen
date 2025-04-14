import type { Browser } from "webextension-polyfill-ts";
import type { ContentScripts } from "../types/ContentScripts";
import type { ExtensionSettings } from "../types/ExtensionSettings";
import { sendMessageToActiveTabs } from "./MessageHelper";

declare const browser: Browser;

export const BROWSER_STORAGE_KEY = "transparentZenSettings";

export const getContentScripts = async (): Promise<ContentScripts | null> => {
	const url = browser.runtime.getURL("data/ContentScripts.json");
	const response = await fetch(url);
	if (response.ok) {
		return response.json();
	}
	return null;
};

export const loadSettings = async (): Promise<ExtensionSettings["transparentZenSettings"] | null> => {
	const settings = await browser.storage.local.get(BROWSER_STORAGE_KEY);
	return settings?.[BROWSER_STORAGE_KEY] || null;
};

export const saveSettings = (settings: ExtensionSettings["transparentZenSettings"] | null) => {
	if (!settings) return false;

	browser.storage.local.set({ [BROWSER_STORAGE_KEY]: settings });
	sendMessageToActiveTabs({ action: "updateSettings" });
	console.info("Settings saved", settings);
};
