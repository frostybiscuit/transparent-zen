class ExtensionPopup {
	BROWSER_STORAGE_KEY = "transparentZenSettings";
	browserStorageSettings = {};
	extensionSettingsForm = document.getElementById("extension-settings");
	supportedWebsitesArea = document.getElementById("supported-websites");

	constructor() {
		this.loadSettings().then((settings) => {
			if (settings) {
				this.browserStorageSettings = settings;
				this.restoreSettings();
				this.bindEvents();
				this.getSupportedWebsites();
			}
		});
	}

	bindEvents() {
		for (const input of this.extensionSettingsForm.querySelectorAll("input")) {
			this.toggleDependantSettings(input);
			input.addEventListener("change", () => {
				browser.runtime.sendMessage({ action: "toggleTransparency", enabled: input.checked });
				this.sendMessageToActiveTabs({ action: "toggleTransparency", enabled: input.checked });
				this.toggleDependantSettings(input);
				this.saveSettings();
			});
		}

		const showAllButton = this.supportedWebsitesArea.querySelector(".show-all");
		showAllButton?.addEventListener("click", () => {
			const target = this.supportedWebsitesArea.querySelector(`[data-content=${showAllButton.dataset.target}]`);
			if (target) {
				target.classList.toggle("open");
				showAllButton.remove();
			}
		});
	}

	async getContentScripts() {
		const response = await fetch("../data/ContentScripts.json");
		if (response.ok) {
			return response.json();
		}
		return false;
	}

	async getSupportedWebsites() {
		const contentScripts = await this.getContentScripts();
		if (!contentScripts) {
			return;
		}

		const supportedWebsitesList = this.supportedWebsitesArea.querySelector("[data-content=supported-sites]");
		for (const website of contentScripts.supportedWebsites) {
			const listElement = document.createElement("li");
			listElement.textContent = website.name;
			supportedWebsitesList.appendChild(listElement);
		}
	}

	toggleDependantSettings(input) {
		const dependantSettings = document.querySelector(`[data-depends-on="${input.name}"]`);
		if (dependantSettings) {
			input.checked ? dependantSettings.classList.add("visible") : dependantSettings.classList.remove("visible");
		}
	}

	restoreSettings() {
		if (this.extensionSettingsForm?.elements) {
			for (const element of this.extensionSettingsForm.elements) {
				if (this.browserStorageSettings[element.name]) {
					switch (element.type) {
						case "checkbox":
							element.checked = JSON.parse(this.browserStorageSettings[element.name]);
							break;
						case "text":
						case "number":
							element.value = this.browserStorageSettings[element.name];
							break;
					}
				}
			}
		}
	}

	async loadSettings() {
		const settings = await browser.storage.local.get(this.BROWSER_STORAGE_KEY);
		console.info("Settings loaded", settings?.[this.BROWSER_STORAGE_KEY]);
		return settings?.[this.BROWSER_STORAGE_KEY] || {};
	}

	saveSettings() {
		if (this.extensionSettingsForm?.elements) {
			for (const element of this.extensionSettingsForm.elements) {
				switch (element.type) {
					case "checkbox":
						this.browserStorageSettings[element.name] = element.checked;
						break;
					case "text":
					case "number":
						this.browserStorageSettings[element.name] = element.value;
						break;
				}
			}

			browser.storage.local.set({ [this.BROWSER_STORAGE_KEY]: this.browserStorageSettings });
			browser.runtime.sendMessage({ action: "updateSettings" });
			console.info("Settings saved", this.browserStorageSettings);
		}
	}

	sendMessageToActiveTabs(message) {
		browser.tabs
			.query({
				currentWindow: true,
				active: true,
			})
			.then((tabs) => {
				for (const tab of tabs) {
					browser.tabs.sendMessage(tab.id, message);
				}
			});
	}
}

new ExtensionPopup();
