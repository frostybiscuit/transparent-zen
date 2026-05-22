import type { Browser } from "webextension-polyfill-ts";
import type { ExtensionSettings } from "../../types/ExtensionSettings";
import type { Message } from "../../types/Message";

declare const browser: Browser;
type ToastMessageType = "info" | "warning" | "error" | "success";

export class WebInspector {
	private readonly TOAST_MESSAGE_DURATION = 5000;
	private transparentZenSettings: ExtensionSettings["transparentZenSettings"];
	private inspectorOutline: HTMLDivElement | undefined;
	private currentInspectorTarget: HTMLElement | null = null;
	private toastMessageContainer: HTMLUListElement | undefined;
	private toastMessageId = 0;

	constructor(settings: ExtensionSettings["transparentZenSettings"]) {
		this.transparentZenSettings = settings;

		this.selectHighlightedElement = this.selectHighlightedElement.bind(this);
		this.setOutlineBounds = this.setOutlineBounds.bind(this);
		this.initializeInspector();
		this.initializeToastMessages();
		this.initializeEvents();
	}

	private initializeInspector() {
		document.addEventListener("DOMContentLoaded", () => {
			this.inspectorOutline = document.createElement("div");
			this.inspectorOutline.classList.add("tz-inspector");
			document.body.appendChild(this.inspectorOutline);
		});
	}

	private initializeEvents() {
		browser.runtime.onMessage.addListener((request: Message) => {
			switch (request.action) {
				case "toggleInspector": {
					if (request.enabled) {
						this.enableInspector();
					} else {
						this.disableInspector();
					}
					break;
				}
			}
		});

		document.addEventListener("keyup", (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				this.disableInspector();
			}
		});
	}

	private selectHighlightedElement(event: MouseEvent) {
		event.preventDefault();
		const target = event.target as HTMLElement;
		const tagName = target.tagName.toLowerCase();
		let selector = "";
		if (target.id) {
			selector = `${tagName}#${target.id}`;
		} else if (target.classList.length) {
			selector = `${tagName}.${target.className.trimEnd().replaceAll(" ", ".")}`;
		} else {
			const datasetKeys = Object.keys(target.dataset).filter((key) => !key.startsWith("tz"));
			if (datasetKeys.length) {
				selector = `${tagName}[data-${datasetKeys[0].replace(/([A-Z])/g, "-$1").toLowerCase()}="${target.dataset[datasetKeys[0]]}"]`;
			}
		}

		if (selector) {
			this.addBackgroundSelector(selector);
			navigator.clipboard.writeText(selector);
			target.style.setProperty("background-color", "transparent", "important");
			browser.runtime.sendMessage({ action: "addCustomBackground", value: selector });
			this.createToastMessage(`The selector "${selector}" is now treated as a background and has been copied to your clipboard!`, "success");
		} else {
			this.createToastMessage("Unfortunately this element does not have any unique identifiers", "error");
		}
		this.disableInspector();
	}

	private setOutlineBounds(event: MouseEvent) {
		if (this.currentInspectorTarget === event.target) return;

		this.currentInspectorTarget = event.target as HTMLElement;
		if (this.inspectorOutline) {
			const targetBounds = this.currentInspectorTarget.getBoundingClientRect();
			this.inspectorOutline.style.left = `${targetBounds.x}px`;
			this.inspectorOutline.style.top = `${window.scrollY + targetBounds.y}px`;
			this.inspectorOutline.style.width = `${targetBounds.width}px`;
			this.inspectorOutline.style.height = `${targetBounds.height}px`;
		}
	}

	private enableInspector() {
		this.inspectorOutline?.classList.add("active");
		document.addEventListener("mousemove", this.setOutlineBounds, { passive: true });
		document.addEventListener("click", this.selectHighlightedElement, { once: true });
	}

	private disableInspector() {
		this.inspectorOutline?.classList.remove("active");
		this.inspectorOutline?.removeAttribute("style");
		document.removeEventListener("mousemove", this.setOutlineBounds);
		document.removeEventListener("click", this.selectHighlightedElement);
	}

	private addBackgroundSelector(selector: string) {
		const siteSpecificSettingIndex = this.transparentZenSettings.siteSpecificSettings?.findIndex((setting) => setting.domain === window.location.hostname);
		if (siteSpecificSettingIndex >= 0) {
			if (this.transparentZenSettings.siteSpecificSettings[siteSpecificSettingIndex].backgroundSelectors.indexOf(selector) === -1) {
				this.transparentZenSettings.siteSpecificSettings[siteSpecificSettingIndex].backgroundSelectors.push(selector);
				this.saveSettings(this.transparentZenSettings);
			}
		}
	}

	private saveSettings(settings: ExtensionSettings["transparentZenSettings"] | null) {
		if (!settings) return false;

		browser.storage.local.set({ transparentZenSettings: settings });
	}

	private initializeToastMessages() {
		document.addEventListener("DOMContentLoaded", () => {
			this.toastMessageContainer = document.createElement("ul");
			this.toastMessageContainer.classList.add("tz-toast-messages");
			document.body.appendChild(this.toastMessageContainer);
		});
	}

	private createToastMessage(message: string, type: ToastMessageType = "info") {
		const toastMessage = document.createElement("li");
		toastMessage.classList.add("tz-toast-message", type);
		toastMessage.dataset.id = this.toastMessageId.toString();
		toastMessage.innerText = message;
		this.toastMessageContainer?.appendChild(toastMessage);

		setTimeout(() => {
			toastMessage.remove();
		}, this.TOAST_MESSAGE_DURATION);

		this.toastMessageId++;
	}
}
