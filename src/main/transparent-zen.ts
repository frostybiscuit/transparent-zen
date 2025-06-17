import type { Browser } from "webextension-polyfill-ts";
import type { ContentScripts, SupportedWebsite } from "../types/ContentScripts";
import type { ExtensionSettings } from "../types/ExtensionSettings";
import type { Message } from "../types/Message";
import "./transparent-zen.css";

declare const browser: Browser;

class TransparentZen {
	BLACKLISTED_ELEMENTS = ["BUTTON", "INPUT", "TEXTAREA", "CODE"];
	transparentZenSettings: ExtensionSettings["transparentZenSettings"] | undefined;
	documentObserver: MutationObserver | undefined;

	constructor() {
		this.initLoadingScreen();
		this.checkIfWebsiteAlreadySupported()
			.then((contentScript) => {
				if (!contentScript) {
					console.info("Website is not supported by Transparent Zen");
					this.initDynamicTransparency();
					this.initBrowserEvents();
				} else {
					console.info("Website is supported by Transparent Zen");
					this.initSupportedWebsite(contentScript);
				}
			})
			.catch((error) => {
				console.error("Error checking supported websites:", error);
				this.removeLoadingScreen();
			});
	}

	//TODO: Remove this after a few releases
	async migrateOldSettings(settings: ExtensionSettings["transparentZenSettings"]): Promise<ExtensionSettings["transparentZenSettings"]> {
		const newSettings = await browser.runtime.sendMessage({ action: "migrateOldSettings", settings });
		return newSettings;
	}

	checkIfWebsiteAlreadySupported(): Promise<SupportedWebsite | false> {
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

	async initSupportedWebsite(contentScript: SupportedWebsite) {
		const settings = (await browser.storage.local.get("transparentZenSettings")) as ExtensionSettings;
		this.transparentZenSettings = await this.migrateOldSettings(settings.transparentZenSettings);
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

	async initDynamicTransparency() {
		const settings = (await browser.storage.local.get("transparentZenSettings")) as ExtensionSettings;
		this.transparentZenSettings = await this.migrateOldSettings(settings.transparentZenSettings);
		if (this.transparentZenSettings?.enableTransparency && (!this.transparentZenSettings?.blacklistedDomains || this.transparentZenSettings?.blacklistedDomains?.indexOf(window.location.hostname) === -1)) {
			browser.runtime.sendMessage({ action: "insertStyles", filePath: "styles/shared/dynamic-transparency.css" });
			this.processPage();
		} else {
			this.removeLoadingScreen();
		}
	}

	initBrowserEvents() {
		browser.runtime.onMessage.addListener((request: Message) => {
			switch (request.action) {
				case "toggleTransparency": {
					if (request.enabled) {
						browser.runtime.sendMessage({ action: "insertStyles", filePath: "styles/shared/dynamic-transparency.css" });
						this.processPage(true);
					} else {
						this.removeTransparencyRules();
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
			}
		});
	}

	processPage(reInit = false) {
		const initializePage = () => {
			this.initExtensionSettingsStyles();
			this.applyTransparencyRules();

			let debounce: number;
			let initialized = false;
			this.documentObserver = new MutationObserver(() => {
				if (debounce) {
					clearTimeout(debounce);
				}
				debounce = setTimeout(() => {
					this.applyTransparencyRules();
					if (!initialized) {
						this.removeLoadingScreen();
						initialized = true;
					}
				}, 100);
			});

			this.documentObserver.observe(document.body, {
				childList: true,
				subtree: true,
			});
		};

		if (reInit) {
			initializePage();
		}

		document.addEventListener("DOMContentLoaded", () => {
			initializePage();
		});

		document.addEventListener("readystatechange", () => {
			if (document.readyState === "complete") {
				this.removeLoadingScreen();
			}
		});

		if (document.readyState === "complete") {
			this.removeLoadingScreen();
		}
	}

	initLoadingScreen() {
		document.documentElement?.style.setProperty("--zen-logo-path", `url(${browser.runtime.getURL("assets/images/zen_logo.svg")})`);
		document.documentElement?.classList.add("tz-hidden");
	}

	removeLoadingScreen() {
		setTimeout(() => {
			document.documentElement.classList.remove("tz-hidden");
			document.documentElement.style.removeProperty("--zen-logo-path");
		}, 500);
	}

	initExtensionSettingsStyles() {
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

	blobToDataURL(blob: Blob): Promise<string> {
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

	applyTransparencyRules(currentElement: HTMLElement = document.body, depth = 0, maxDepth = this.transparentZenSettings?.transparencyDepth || 2, insideOverlay = false) {
		const styleMap = window.getComputedStyle(currentElement);
		const hasBackground = styleMap.backgroundColor !== "rgba(0, 0, 0, 0)" && styleMap.backgroundColor !== "transparent" && styleMap.backgroundColor !== "var(--transparent-background)";
		const hasGradient = styleMap.background.indexOf("gradient(") >= 0;
		let nextDepth = depth;
		let isInsideOverlay = insideOverlay;

		if (currentElement.tagName === "A") {
			currentElement.dataset.tzProcessed = "true";
			currentElement.dataset.tzAnchor = "true";
			if (styleMap.backgroundColor && styleMap.backgroundColor !== "rgba(0, 0, 0, 0)" && styleMap.backgroundColor !== "transparent") {
				const hasLowContrast = this.hasLowContrast(styleMap.backgroundColor, styleMap.color);
				if (hasLowContrast) {
					currentElement.dataset.tzProcessed = "true";
					currentElement.dataset.tzLowContrast = "true";
				}
			}
		}

		if (currentElement.tagName === "CODE") {
			if (hasBackground) {
				currentElement.dataset.tzHasBackground = "true";
			}
		}

		if (this.BLACKLISTED_ELEMENTS.includes(currentElement.tagName)) return;

		if (hasBackground) {
			if (depth === 0 && isInsideOverlay) {
				currentElement.dataset.tzInsideOverlay = "true";
			}

			if (styleMap.color && this.hasTextNodes(currentElement)) {
				const hasLowContrast = this.hasLowContrast(styleMap.backgroundColor, styleMap.color);
				if (hasLowContrast) {
					currentElement.dataset.tzProcessed = "true";
					currentElement.dataset.tzLowContrast = "true";
				}
			}
		}

		if (styleMap.color && this.hasLowLumen(styleMap.color)) {
			currentElement.dataset.tzProcessed = "true";
			currentElement.dataset.tzLowLumen = "true";
		}

		if (hasGradient) {
			currentElement.dataset.tzProcessed = "true";
			currentElement.dataset.tzGradient = "true";
		}

		if (depth <= 1) {
			const parentStyleMap = currentElement.parentElement ? window.getComputedStyle(currentElement.parentElement) : null;
			if (styleMap.position === "fixed" || styleMap.position === "absolute" || styleMap.position === "sticky" || parentStyleMap?.position === "fixed" || parentStyleMap?.position === "absolute" || parentStyleMap?.position === "sticky") {
				currentElement.dataset.tzProcessed = "true";
				currentElement.dataset.tzOverlay = "true";
				isInsideOverlay = true;
			}
		}

		if (hasBackground && depth <= maxDepth && !currentElement.dataset.tzDepth) {
			currentElement.dataset.tzProcessed = "true";
			currentElement.dataset.tzDepth = depth.toString();
			nextDepth++;
		}

		for (const child of currentElement.children) {
			this.applyTransparencyRules(child as HTMLElement, nextDepth, maxDepth, isInsideOverlay);
		}
	}

	applyCustomProperty(property: string, color: string) {
		document.body.style.setProperty(property, color);
	}

	removeTransparencyRules() {
		if (this.documentObserver) {
			this.documentObserver.disconnect();
		}

		browser.runtime.sendMessage({ action: "removeStyles", filePath: "styles/shared/dynamic-transparency.css" });

		document.body.style.removeProperty("--color-primary");
		document.body.style.removeProperty("--color-text");
		document.body.style.removeProperty("--color-background");
		document.body.style.removeProperty("--custom-background-image");
		document.documentElement?.classList.remove("tz-custom-background");

		const processedElements = document.querySelectorAll("[data-tz-processed]");
		for (const element of processedElements) {
			element.removeAttribute("data-tz-processed");
			element.removeAttribute("data-tz-depth");
			element.removeAttribute("data-tz-overlay");
			element.removeAttribute("data-tz-low-contrast");
			element.removeAttribute("data-tz-low-lumen");
			element.removeAttribute("data-tz-gradient");
			element.removeAttribute("data-tz-inside-overlay");
			element.removeAttribute("data-tz-anchor");
		}
	}

	hasTextNodes = (element: HTMLElement) => {
		const textNodes = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue?.trim() !== "");
		return textNodes.length > 0;
	};

	hasLowLumen = (rgb: string) => {
		if (rgb.match(/^rgb/)) {
			const color = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
			if (!color) return false;

			const r = color[1];
			const g = color[2];
			const b = color[3];

			return this.getLuminance(r, g, b) < 0.5;
		}

		return false;
	};

	hasLowContrast = (backgroundColor: string, textColor: string) => {
		if (backgroundColor.match(/^rgb/) && textColor.match(/^rgb/)) {
			const backgroundRgb = backgroundColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
			const textRgb = textColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

			if (!backgroundRgb || !textRgb) return false;

			const backgroundLumen = this.getLuminance(backgroundRgb[1], backgroundRgb[2], backgroundRgb[3]);
			const textLumen = this.getLuminance(textRgb[1], textRgb[2], textRgb[3]);

			return (Math.max(backgroundLumen, textLumen) + 0.05) / (Math.min(backgroundLumen, textLumen) + 0.05) < 4.5;
		}

		return false;
	};

	getLuminance = (r: string, g: string, b: string) => {
		const [R, G, B] = [r, g, b].map((color) => {
			const normalizedColor = Number.parseInt(color) / 255;
			return normalizedColor <= 0.03928 ? normalizedColor / 12.92 : ((normalizedColor + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * R + 0.7152 * G + 0.0722 * B;
	};
}

new TransparentZen();
