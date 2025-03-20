class TransparentZen {
	BLACKLISTED_ELEMENTS = ["BUTTON", "A", "INPUT", "TEXTAREA"];
	transparentZenSettings;

	constructor() {
		this.checkIfWebsiteAlreadySupported().then((isSupported) => {
			if (!isSupported) {
				console.info("Website is not supported by Transparent Zen");
				this.initTransparency();
				this.initBrowserEvents();
			} else {
				console.info("Website is supported by Transparent Zen");
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
								resolve(true);
								break;
							}
						}
					}
				}
				resolve(false);
			});
		});
	}

	initTransparency() {
		browser.storage.local.get("transparentZenSettings", (settings) => {
			this.transparentZenSettings = settings.transparentZenSettings;
			if (this.transparentZenSettings?.["enable-transparency"]) {
				this.processPage();
			}
		});
	}

	initBrowserEvents() {
		browser.runtime.onMessage.addListener((request) => {
			if (request.action === "toggleTransparency") {
				if (request.enabled) {
					this.processPage();
				} else {
					document.getElementById("transparent-zen-base-css")?.remove();
					document.getElementById("transparent-zen-dynamic-css")?.remove();
					location.reload();
				}
			}
		});
	}

	processPage() {
		const baseStyles = document.createElement("link");
		baseStyles.rel = "stylesheet";
		baseStyles.id = "transparent-zen-base-css";
		baseStyles.href = browser.runtime.getURL("styles/global/base.css");
		document.head.insertAdjacentElement("beforeend", baseStyles);

		document.addEventListener("DOMContentLoaded", () => {
			this.applyTransparencyRules();

			let debounce;
			const observer = new MutationObserver(() => {
				if (debounce) {
					clearTimeout(debounce);
				}
				debounce = setTimeout(() => {
					this.applyTransparencyRules();
				}, 100);
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true,
			});
		});
	}

	applyTransparencyRules(root = document.body, depth = 0, maxDepth = this.transparentZenSettings?.["transparency-depth"] || 3) {
		if (root.tagName === "A") {
			const styleMap = window.getComputedStyle(root);
			root.style.color = "var(--color-primary)";
			for (const child of root.children) {
				child.style.color = "var(--color-primary)";
			}
			if (styleMap.backgroundColor && styleMap.backgroundColor !== "rgba(0, 0, 0, 0)" && styleMap.backgroundColor !== "transparent") {
				const hasLowContrast = this.hasLowContrast(styleMap.backgroundColor, styleMap.color);
				if (hasLowContrast) {
					console.log("Has low contrast", root);
					root.style.backgroundColor = "var(--transparent-background)";
				}
			}
		}

		if (this.BLACKLISTED_ELEMENTS.includes(root.tagName)) {
			return;
		}

		const style = window.getComputedStyle(root);
		const parentStyleMap = window.getComputedStyle(root.parentElement);
		const background = style.backgroundColor;
		const color = style.color;
		let nextDepth = depth;

		if (color && this.hasLowLumen(color)) {
			root.style.color = "white";
		}

		if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent" && root.dataset.tzProcessed !== "true") {
			if (depth === 0 && root.offsetWidth - 100 > document.documentElement.offsetWidth) {
				root.style.backgroundColor = "transparent";
				root.dataset.tzProcessed = true;
				nextDepth++;
			} else if (depth <= Number.parseInt(maxDepth)) {
				if (style.position === "fixed" || style.position === "absolute" || style.position === "sticky" || parentStyleMap.position === "fixed" || parentStyleMap.position === "absolute" || parentStyleMap.position === "sticky") {
					root.style.backgroundColor = "var(--transparent-background-darker)";
					root.style.backdropFilter = "var(--backdrop-blur)";
				} else {
					root.style.backgroundColor = "var(--transparent-background)";
				}

				root.dataset.tzProcessed = true;
				nextDepth++;
			}
		}

		for (const child of root.children) {
			this.applyTransparencyRules(child, nextDepth, maxDepth);
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
