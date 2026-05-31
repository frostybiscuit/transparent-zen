import type { Browser } from "webextension-polyfill-ts";
import type { ContentScripts, SupportedWebsite } from "../types/ContentScripts";
import type { ExtensionSettings, SiteSpecificSetting } from "../types/ExtensionSettings";
import type { Message } from "../types/Message";
import { DynamicTransparency } from "./modules/DynamicTransparency";
import { SupportedSite } from "./modules/SupportedSite";
import { WebInspector } from "./modules/WebInspector";
import "./transparent-zen.css";

declare const browser: Browser;

class TransparentZen {
	private dynamicTransparency: DynamicTransparency | undefined;
	private supportedSite: SupportedSite | undefined;
	private webInspector: WebInspector | undefined;
	private transparentZenSettings: ExtensionSettings["transparentZenSettings"] | undefined;
	private siteSpecificSettings: SiteSpecificSetting | null = null;
	private isSupportedWebsite = false;

	constructor() {
		this.initLoadingScreen();
		// biome-ignore format: readability
		this.checkIfWebsiteAlreadySupported().then(contentScript => {
			browser.storage.local.get("transparentZenSettings").then(async (settings) => {
				this.transparentZenSettings = (settings as ExtensionSettings).transparentZenSettings;
				if (!contentScript) {
					console.info("Website is not supported by Transparent Zen");
					this.webInspector = new WebInspector(this.transparentZenSettings);
					this.dynamicTransparency = new DynamicTransparency(this.transparentZenSettings, this.removeLoadingScreen, this.initExtensionSettingsStyles.bind(this));
					await this.dynamicTransparency?.initDynamicTransparency();
					this.initSiteSpecificSettings();
					this.initBrowserEvents();
				} else {
					console.info("Website is supported by Transparent Zen");
					this.supportedSite = new SupportedSite(this.transparentZenSettings, this.removeLoadingScreen, this.initExtensionSettingsStyles.bind(this), this.initBrowserEvents.bind(this));
					await this.supportedSite?.initSupportedWebsite(contentScript);
					this.initSiteSpecificSettings();
				}
			}).catch((error) => {
				console.error("Error checking supported websites:", error);
				this.removeLoadingScreen();
			});
		});
	}

	private checkIfWebsiteAlreadySupported(): Promise<SupportedWebsite | false> {
		const contentScriptsUrl = browser.runtime.getURL("data/ContentScripts.json");
		return new Promise((resolve) => {
			fetch(contentScriptsUrl).then(async (response) => {
				if (response.ok) {
					const data: ContentScripts = await response.json();
					const currentUrl = window.location.href;
					for (const script of data.supportedWebsites) {
						for (const match of script.matches) {
							const regex = new RegExp(match);
							if (regex.test(currentUrl)) {
								this.isSupportedWebsite = true;
								resolve(script as SupportedWebsite);
								break;
							}
						}
					}
				}
				resolve(false);
			});
		});
	}

	private applyCustomBackgrounds(): void {
		if (!this.siteSpecificSettings) return;

		if (this.siteSpecificSettings.backgroundSelectors.length) {
			let customStyles = document.getElementById("tz-custom-backgrounds") as HTMLStyleElement | null;
			if (!customStyles) {
				customStyles = document.createElement("style");
				customStyles.id = "tz-custom-backgrounds";
				document.head.append(customStyles);
			}
			customStyles.textContent = `
				${this.siteSpecificSettings.backgroundSelectors.join(",")} {
					background-color: transparent !important;

					&[data-tz-processed] {
						&[data-tz-depth] {
							background-color: transparent !important;
						}
					}
				}`;
		}
	}

	private applyCustomStyles(): void {
		if (!this.siteSpecificSettings) return;

		let customStyles = document.getElementById("tz-custom-styles") as HTMLStyleElement | null;
		if (!customStyles) {
			customStyles = document.createElement("style");
			customStyles.id = "tz-custom-styles";
			document.head.append(customStyles);
		}
		customStyles.textContent = this.siteSpecificSettings.customStyles;
	}

	private removeCustomStyles(): void {
		const customStyles = document.getElementById("tz-custom-styles") as HTMLStyleElement | null;
		customStyles?.remove();
	}

	private initBrowserEvents(): void {
		browser.runtime.onMessage.addListener((request: Message) => {
			switch (request.action) {
				case "toggleTransparency": {
					if (this.isSupportedWebsite) break;

					if (request.enabled) {
						browser.runtime.sendMessage({ action: "insertStyles", filePath: "styles/shared/dynamic-transparency.css" });
						if (!this.transparentZenSettings?.lightweightTransparency) {
							this.dynamicTransparency?.processPage(true);
						}
					} else {
						this.dynamicTransparency?.removeTransparencyRules();
					}
					break;
				}
				case "toggleLightweight": {
					if (this.isSupportedWebsite) break;

					if (request.enabled) {
						this.dynamicTransparency?.removeTransparencyRules();
						browser.runtime.sendMessage({ action: "insertStyles", filePath: "styles/shared/dynamic-transparency.css" });
					} else {
						this.dynamicTransparency?.processPage(true);
					}
					break;
				}
				case "toggleWhitelist": {
					if (!this.transparentZenSettings?.blacklistedDomains || this.isSupportedWebsite) break;

					if (request.enabled) {
						if (this.transparentZenSettings?.blacklistedDomains.indexOf(window.location.hostname) >= 0) {
							browser.runtime.sendMessage({ action: "insertStyles", filePath: "styles/shared/dynamic-transparency.css" });
							if (!this.transparentZenSettings?.lightweightTransparency) {
								this.dynamicTransparency?.processPage(true);
							}
						} else {
							this.dynamicTransparency?.removeTransparencyRules();
						}
					} else {
						if (this.transparentZenSettings?.blacklistedDomains.indexOf(window.location.hostname) >= 0) {
							this.dynamicTransparency?.removeTransparencyRules();
						} else {
							browser.runtime.sendMessage({ action: "insertStyles", filePath: "styles/shared/dynamic-transparency.css" });
							if (!this.transparentZenSettings?.lightweightTransparency) {
								this.dynamicTransparency?.processPage(true);
							}
						}
					}
					break;
				}
				case "toggleInspector": {
					if (request.enabled) {
						this.webInspector?.enableInspector();
					} else {
						this.webInspector?.disableInspector();
					}
					break;
				}
				case "getDomain": {
					return Promise.resolve(window.location.hostname);
				}
				case "changePrimaryColor": {
					this.applyCustomProperty("--color-primary", request.value as string);
					break;
				}
				case "changeTextColor": {
					this.applyCustomProperty("--color-text", request.value as string);
					break;
				}
				case "changeBackgroundColor": {
					this.applyCustomProperty("--transparent-background", request.value as string);
					break;
				}
				case "changeBackgroundImage": {
					if (request.value) {
						const backgroundImage = request.value as Blob;
						this.blobToDataURL(backgroundImage).then((dataUrl) => {
							this.applyCustomProperty("--custom-background-image", `url(${dataUrl})`);
							document.documentElement?.classList.add("tz-custom-background");
						});
					} else {
						this.applyCustomProperty("--custom-background-image", "none");
						document.documentElement?.classList.remove("tz-custom-background");
					}
					break;
				}
				case "changeBackgroundImageOpacity": {
					this.applyCustomProperty("--custom-background-image-opacity", ((request.value as number) / 100).toString());
					break;
				}
				case "changeBackgroundImageBlur": {
					this.applyCustomProperty("--custom-background-image-blur", `blur(${request.value}px)`);
					break;
				}
				case "changeBackgroundImageBrightness": {
					this.applyCustomProperty("--custom-background-image-brightness", `brightness(${(request.value as number) / 100})`);
					break;
				}
				case "changeCustomStyles": {
					if (this.siteSpecificSettings) {
						this.siteSpecificSettings.customStyles = request.value as string;
						this.applyCustomStyles();
					} else {
						browser.storage.local.get("transparentZenSettings").then((settings) => {
							this.transparentZenSettings = settings.transparentZenSettings;
							if (this.transparentZenSettings?.siteSpecificSettings.length) {
								for (const setting of this.transparentZenSettings.siteSpecificSettings) {
									if (setting.domain === window.location.hostname) {
										this.siteSpecificSettings = setting;
										this.applyCustomStyles();
									}
								}
							}
						});
					}
					break;
				}
				case "toggleSiteSpecificSettings": {
					const enabled = request.value as boolean;
					if (enabled) {
						this.applyCustomStyles();
					} else {
						this.removeCustomStyles();
					}
				}
			}
		});
	}

	private initLoadingScreen(): void {
		document.documentElement?.style.setProperty("--zen-logo-path", `url(${browser.runtime.getURL("assets/images/zen_logo.svg")})`);
		document.documentElement?.classList.add("tz-hidden");
	}

	private removeLoadingScreen(): void {
		setTimeout(() => {
			document.documentElement.classList.remove("tz-hidden");
			document.documentElement.style.removeProperty("--zen-logo-path");
		}, 500);
	}

	private async initSiteSpecificSettings(): Promise<void> {
		if (!this.transparentZenSettings) {
			const settings = (await browser.storage.local.get("transparentZenSettings")) as ExtensionSettings;
			this.transparentZenSettings = settings.transparentZenSettings;
		}

		if (this.transparentZenSettings?.siteSpecificSettings.length) {
			for (const setting of this.transparentZenSettings.siteSpecificSettings) {
				if (setting.domain === window.location.hostname) {
					this.siteSpecificSettings = setting;
					if (setting.enabled) {
						this.applyCustomBackgrounds();
						this.applyCustomStyles();
					}
				}
			}
		}
	}

	private initExtensionSettingsStyles(): void {
		document.documentElement.classList.add("tz-initialized");
		if (this.transparentZenSettings?.primaryColor) {
			this.applyCustomProperty("--color-primary", this.transparentZenSettings.primaryColor);
		}
		if (this.transparentZenSettings?.textColor) {
			this.applyCustomProperty("--color-text", this.transparentZenSettings.textColor);
		}
		if (this.transparentZenSettings?.backgroundColor) {
			this.applyCustomProperty("--transparent-background", this.transparentZenSettings.backgroundColor);
		}
		if (this.transparentZenSettings?.backgroundImage) {
			this.blobToDataURL(this.transparentZenSettings.backgroundImage).then((dataUrl) => {
				this.applyCustomProperty("--custom-background-image", `url(${dataUrl})`);
				document.documentElement?.classList.add("tz-custom-background");
			});
			if (this.transparentZenSettings.backgroundImageOpacity) {
				const opacity = this.transparentZenSettings.backgroundImageOpacity / 100;
				this.applyCustomProperty("--custom-background-image-opacity", opacity.toString());
			}
			if (this.transparentZenSettings.backgroundImageBlur) {
				this.applyCustomProperty("--custom-background-image-blur", `blur(${this.transparentZenSettings.backgroundImageBlur}px)`);
			}
			if (this.transparentZenSettings.backgroundImageBrightness) {
				const brightness = this.transparentZenSettings.backgroundImageBrightness / 100;
				this.applyCustomProperty("--custom-background-image-brightness", `brightness(${brightness})`);
			}
		}
	}

	private blobToDataURL(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				resolve(reader.result as string);
			};
			reader.onerror = (error) => {
				reject(error);
			};
			reader.readAsDataURL(blob);
		});
	}

	private applyCustomProperty(property: string, color: string): void {
		document.body.style.setProperty(property, color);
	}
}

new TransparentZen();
