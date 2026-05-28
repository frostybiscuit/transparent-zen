import type { Browser } from "webextension-polyfill-ts";
import type { ExtensionSettings } from "../../types/ExtensionSettings";

declare const browser: Browser;

export class DynamicTransparency {
	private readonly BLACKLISTED_ELEMENTS = ["BUTTON", "INPUT", "TEXTAREA", "CODE"];
	private readonly BLACKLISTED_CLASSES = ["button", "btn", "tz-toast-messages", "tz-inspector"];
	private transparentZenSettings: ExtensionSettings["transparentZenSettings"];
	private documentObserver: MutationObserver | undefined;
	private removeLoadingScreen: () => void;
	private initExtensionSettingsStyles: () => void;

	constructor(settings: ExtensionSettings["transparentZenSettings"], removeLoadingScreen: () => void, initExtensionSettingsStyles: () => void) {
		this.transparentZenSettings = settings;
		this.removeLoadingScreen = removeLoadingScreen;
		this.initExtensionSettingsStyles = initExtensionSettingsStyles;
	}

	public async initDynamicTransparency() {
		if (this.transparentZenSettings?.enableTransparency) {
			const isInBlacklist = this.transparentZenSettings?.blacklistedDomains?.indexOf(window.location.hostname) >= 0;
			if (!this.transparentZenSettings?.blacklistedDomains || (!this.transparentZenSettings.enableWhitelist && !isInBlacklist) || (this.transparentZenSettings.enableWhitelist && isInBlacklist)) {
				browser.runtime.sendMessage({ action: "insertStyles", filePath: "styles/shared/dynamic-transparency.css" });
				if (!this.transparentZenSettings.lightweightTransparency) {
					this.processPage();
				} else {
					this.removeLoadingScreen();
				}
			} else {
				this.removeLoadingScreen();
			}
		} else {
			this.removeLoadingScreen();
		}
	}

	public processPage(reInit = false) {
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

	public applyTransparencyRules(currentElement: HTMLElement = document.body, depth = 0, maxDepth = this.transparentZenSettings?.transparencyDepth || 2, insideOverlay = false) {
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
		for (const blacklistedClass of this.BLACKLISTED_CLASSES) {
			if (currentElement.className.indexOf?.(blacklistedClass) !== -1) {
				return;
			}
		}

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

	public removeTransparencyRules() {
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

	private hasTextNodes = (element: HTMLElement): boolean => {
		const textNodes = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue?.trim() !== "");
		return textNodes.length > 0;
	};

	private hasLowLumen = (rgb: string): boolean => {
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

	private hasLowContrast = (backgroundColor: string, textColor: string): boolean => {
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

	private getLuminance = (r: string, g: string, b: string): number => {
		const [R, G, B] = [r, g, b].map((color) => {
			const normalizedColor = Number.parseInt(color) / 255;
			return normalizedColor <= 0.03928 ? normalizedColor / 12.92 : ((normalizedColor + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * R + 0.7152 * G + 0.0722 * B;
	};
}
