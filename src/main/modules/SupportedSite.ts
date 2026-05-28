import type { Browser } from "webextension-polyfill-ts";
import type { SupportedWebsite } from "../../types/ContentScripts";
import type { ExtensionSettings, SiteSpecificSetting } from "../../types/ExtensionSettings";

declare const browser: Browser;

export class SupportedSite {
	public siteSpecificSettings: SiteSpecificSetting | null = null;
	private transparentZenSettings: ExtensionSettings["transparentZenSettings"];
	private removeLoadingScreen: () => void;
	private initExtensionSettingsStyles: () => void;
	private initBrowserEvents: () => void;

	constructor(settings: ExtensionSettings["transparentZenSettings"], removeLoadingScreen: () => void, initExtensionSettingsStyles: () => void, initBrowserEvents: () => void) {
		this.transparentZenSettings = settings;
		this.removeLoadingScreen = removeLoadingScreen;
		this.initExtensionSettingsStyles = initExtensionSettingsStyles;
		this.initBrowserEvents = initBrowserEvents;
	}

	public async initSupportedWebsite(contentScript: SupportedWebsite): Promise<void> {
		if (
			!this.transparentZenSettings?.disabledWebsites ||
			this.transparentZenSettings?.disabledWebsites?.findIndex((website) => {
				for (const match of website.matches) {
					const regex = new RegExp(match);
					if (regex.test(window.location.href)) {
						return true;
					}
				}
				return false;
			}) === -1
		) {
			browser.runtime.sendMessage({ action: "insertStyles", filePath: contentScript.css?.[0], domains: contentScript.matches });
			this.initBrowserEvents();
		}

		if (document.readyState === "complete") {
			this.initExtensionSettingsStyles();
			this.removeLoadingScreen();
		} else if (document.readyState === "interactive") {
			document.addEventListener("readystatechange", () => {
				if (document.readyState === "complete") {
					this.initExtensionSettingsStyles();
					this.removeLoadingScreen();
				}
			});
		} else {
			document.addEventListener("DOMContentLoaded", () => {
				this.initExtensionSettingsStyles();
				this.removeLoadingScreen();
			});
		}
	}
}
