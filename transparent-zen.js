class TransparentZen {
	BLACKLISTED_ELEMENTS = ["BUTTON", "INPUT", "TEXTAREA"];
	transparentZenSettings;
	documentObserver;

	constructor() {
		this.initLoadingScreen();
		this.checkIfWebsiteAlreadySupported().then((contentScript) => {
			if (!contentScript) {
				console.info("Website is not supported by Transparent Zen");
				this.initTransparency();
				this.initBrowserEvents();
			} else {
				console.info("Website is supported by Transparent Zen");
				this.initSupportedWebsite(contentScript);
			}
		});
	}

	checkIfWebsiteAlreadySupported() {
		const contentScriptsUrl = browser.runtime.getURL("data/ContentScripts.json");
		return new Promise((resolve) => {
			fetch(contentScriptsUrl).then(async (response) => {
				if (response.ok) {
					const data = await response.json();
					const currentUrl = window.location.href;
					for (const script of data.supportedWebsites) {
						for (const match of script.matches) {
							if (this.matchesHref(currentUrl, match)) {
								resolve(script);
								break;
							}
						}
					}
				}
				resolve(false);
			});
		});
	}

	initSupportedWebsite(contentScript) {
		browser.storage.local.get("transparentZenSettings", (settings) => {
			this.transparentZenSettings = settings.transparentZenSettings;
			if (
				!this.transparentZenSettings?.disabledWebsites ||
				this.transparentZenSettings?.disabledWebsites?.findIndex((website) => {
					for (const match of website.matches) {
						if (this.matchesHref(window.location.href, match)) {
							return true;
						}
					}
					return false;
				}) === -1
			) {
				browser.runtime.sendMessage({ action: "insertStyles", filePath: contentScript.css[0], domains: contentScript.matches });
				this.initBrowserEvents();
			}
			if (document.readyState === "complete") {
				this.initExtensionSettingsStyles();
				this.removeLoadingScreen();
			} else {
				document.addEventListener("DOMContentLoaded", () => {
					this.initExtensionSettingsStyles();
					this.removeLoadingScreen();
				});
			}
		});
	}

	initTransparency() {
		browser.storage.local.get("transparentZenSettings", (settings) => {
			this.transparentZenSettings = settings.transparentZenSettings;
			if (this.transparentZenSettings?.["enable-transparency"] && (!this.transparentZenSettings?.blacklistedDomains || this.transparentZenSettings?.blacklistedDomains?.indexOf(window.location.hostname) === -1)) {
				this.processPage();
			} else {
				this.removeLoadingScreen();
			}
		});
	}

	initBrowserEvents() {
		browser.runtime.onMessage.addListener((request) => {
			switch (request.action) {
				case "toggleTransparency": {
					if (request.enabled) {
						this.processPage();
					} else {
						document.getElementById("transparent-zen-base-css")?.remove();
						document.getElementById("transparent-zen-dynamic-css")?.remove();
						this.removeTransparencyRules();
					}
					break;
				}
				case "getDomain": {
					return Promise.resolve(window.location.hostname);
				}
				case "changePrimaryColor": {
					this.applyPrimaryColor(request.value);
					break;
				}
				case "changeTextColor": {
					this.applyTextColor(request.value);
					break;
				}
				case "changeBackgroundColor": {
					this.applyBackgroundColor(request.value);
					break;
				}
			}
		});
	}

	processPage() {
		const baseStyles = document.createElement("link");
		baseStyles.rel = "stylesheet";
		baseStyles.id = "transparent-zen-base-css";
		baseStyles.href = browser.runtime.getURL("styles/global/dynamic-transparency.css");
		document.head.insertAdjacentElement("beforeend", baseStyles);

		if (document.readyState !== "complete") {
			this.initLoadingScreen();
		}

		document.addEventListener("DOMContentLoaded", () => {
			this.initExtensionSettingsStyles();
			this.applyTransparencyRules();

			let debounce;
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
		});

		document.addEventListener("readystatechange", () => {
			if (document.readyState === "complete") {
				this.removeLoadingScreen();
			}
		});
	}

	initLoadingScreen() {
		document.documentElement?.classList.add("tz-hidden");
		document.documentElement?.style.setProperty("--zen-logo-path", `url(${browser.runtime.getURL("assets/images/zen_logo.svg")})`);
	}

	removeLoadingScreen() {
		setTimeout(() => {
			document.documentElement.classList.remove("tz-hidden", "tz-small-loading-icon");
			document.documentElement.style.removeProperty("--zen-logo-path");
		}, 500);
	}

	initExtensionSettingsStyles() {
		if (this.transparentZenSettings?.["primary-color"]) {
			this.applyPrimaryColor(this.transparentZenSettings["primary-color"]);
		}
		if (this.transparentZenSettings?.["text-color"]) {
			this.applyTextColor(this.transparentZenSettings["text-color"]);
		}
		if (this.transparentZenSettings?.["background-color"]) {
			this.applyBackgroundColor(this.transparentZenSettings["background-color"]);
		}
	}

	applyTransparencyRules(root = document.body, depth = 0, maxDepth = this.transparentZenSettings?.["transparency-depth"] || 3, insideOverlay = false) {
		if (root.tagName === "A") {
			const styleMap = window.getComputedStyle(root);
			root.style.color = "var(--color-primary)";
			for (const child of root.children) {
				child.style.color = "var(--color-primary)";
			}
			if (styleMap.backgroundColor && styleMap.backgroundColor !== "rgba(0, 0, 0, 0)" && styleMap.backgroundColor !== "transparent") {
				const hasLowContrast = this.hasLowContrast(styleMap.backgroundColor, styleMap.color);
				if (hasLowContrast) {
					root.dataset.tzLowContrast = true;
					root.dataset.tzProcessed = true;
				}
			}
		}

		if (this.BLACKLISTED_ELEMENTS.includes(root.tagName)) {
			return;
		}

		const style = window.getComputedStyle(root);
		const parentStyleMap = window.getComputedStyle(root.parentElement);
		const background = style.backgroundColor;
		const hasBackground = background !== "rgba(0, 0, 0, 0)" && background !== "transparent";
		const hasGradient = style.background.indexOf("gradient(") >= 0;
		const color = style.color;
		let nextDepth = depth;
		let isInsideOverlay = insideOverlay;

		if (color && this.hasLowLumen(color)) {
			root.dataset.tzProcessed = true;
			root.dataset.tzLowLumen = true;

			if (hasBackground) {
				root.dataset.tzDepth = depth;
			}
		}

		if (hasGradient) {
			root.dataset.tzProcessed = true;
			root.dataset.tzGradient = true;
		}

		if (style.position === "fixed" || style.position === "absolute" || style.position === "sticky" || parentStyleMap.position === "fixed" || parentStyleMap.position === "absolute" || parentStyleMap.position === "sticky") {
			if (depth <= 1) {
				root.dataset.tzProcessed = true;
				root.dataset.tzOverlay = true;
				isInsideOverlay = true;

				if (hasBackground) {
					root.dataset.tzDepth = "-1";
				}
			}
		}

		if (!root.dataset.tzProcessed) {
			if (hasBackground && color) {
				const hasLowContrast = this.hasLowContrast(style.backgroundColor, style.color);
				if (hasLowContrast) {
					root.dataset.tzLowContrast = true;
					root.dataset.tzProcessed = true;
					root.dataset.tzDepth = depth;
				}
			}

			if (hasBackground) {
				if (depth === 0 && isInsideOverlay) {
					root.dataset.tzInsideOverlay = true;
				}
				if (depth <= Number.parseInt(maxDepth)) {
					root.dataset.tzProcessed = true;
					root.dataset.tzDepth = depth;
					nextDepth++;
				}
			}
		}

		for (const child of root.children) {
			this.applyTransparencyRules(child, nextDepth, maxDepth, isInsideOverlay);
		}
	}

	applyPrimaryColor(color) {
		document.body.style.setProperty("--color-primary", color);
	}

	applyTextColor(color) {
		document.body.style.setProperty("--color-text", color);
	}

	applyBackgroundColor(color) {
		document.body.style.setProperty("--transparent-background", color);
	}

	removeTransparencyRules() {
		if (this.documentObserver) {
			this.documentObserver.disconnect();
		}

		document.body.style.removeProperty("--color-primary");

		const processedElements = document.querySelectorAll("[data-tz-processed]");
		for (const element of processedElements) {
			element.removeAttribute("data-tz-processed");
			element.removeAttribute("data-tz-depth");
			element.removeAttribute("data-tz-overlay");
			element.removeAttribute("data-tz-low-contrast");
			element.removeAttribute("data-tz-low-lumen");
		}
	}

	hasLowLumen = (rgb) => {
		if (rgb.match(/^rgb/)) {
			const color = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

			const r = color[1];
			const g = color[2];
			const b = color[3];

			return this.getLuminance(r, g, b) < 0.5;
		}

		return false;
	};

	hasLowContrast = (backgroundColor, textColor) => {
		if (backgroundColor.match(/^rgb/) && textColor.match(/^rgb/)) {
			const backgroundRgb = backgroundColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
			const textRgb = textColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

			const backgroundLumen = this.getLuminance(backgroundRgb[1], backgroundRgb[2], backgroundRgb[3]);
			const textLumen = this.getLuminance(textRgb[1], textRgb[2], textRgb[3]);

			return (Math.max(backgroundLumen, textLumen) + 0.05) / (Math.min(backgroundLumen, textLumen) + 0.05) < 4.5;
		}

		return false;
	};

	getLuminance = (r, g, b) => {
		const [R, G, B] = [r, g, b].map((color) => {
			const normalizedColor = color / 255;
			return normalizedColor <= 0.03928 ? normalizedColor / 12.92 : ((normalizedColor + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * R + 0.7152 * G + 0.0722 * B;
	};

	wildcardToRegex(pattern) {
		return new RegExp(pattern.replace(/\./, ".?").replaceAll(/\*/g, "[^ ]*"));
	}

	matchesHref(href, pattern) {
		const regex = this.wildcardToRegex(pattern);
		return regex.test(href);
	}
}

new TransparentZen();
