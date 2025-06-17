import type { Browser } from "webextension-polyfill-ts";
import type { ExtensionSettings } from "../types/ExtensionSettings";
import type { Message } from "../types/Message";

declare const browser: Browser;

browser.runtime.onMessage.addListener((message: Message) => {
	switch (message.action) {
		case "insertStyles": {
			applyStyles(message.filePath, message.domains);
			break;
		}

		case "removeStyles": {
			browser.tabs.removeCSS({ file: message.filePath });
			break;
		}

		case "migrateOldSettings": {
			const newSettings = migrateOldSettings(message.settings);
			return Promise.resolve(newSettings);
		}
	}
});

async function applyStyles(filePath?: string, domains?: Array<string>) {
	const tabs = await browser.tabs.query({
		currentWindow: true,
		active: true,
	});

	for (const tab of tabs) {
		if (domains) {
			for (const domain of domains) {
				const regex = new RegExp(domain);
				if (tab.url && regex.test(tab.url)) {
					browser.tabs.insertCSS(tab.id, { file: filePath });
				}
			}
		} else {
			browser.tabs.insertCSS(tab.id, { file: filePath });
		}
	}
}

function migrateOldSettings(settings?: ExtensionSettings["transparentZenSettings"]) {
	if (!settings) return;

	console.info("Migrating old settings...", settings);

	if (settings["enable-transparency"] !== undefined) {
		settings.enableTransparency = settings["enable-transparency"];
		// biome-ignore lint/performance/noDelete: necessary for migration
		delete settings["enable-transparency"];
	}
	if (settings["text-color"] !== undefined) {
		settings.textColor = settings["text-color"];
		// biome-ignore lint/performance/noDelete: necessary for migration
		delete settings["text-color"];
	}
	if (settings["primary-color"] !== undefined) {
		settings.primaryColor = settings["primary-color"];
		// biome-ignore lint/performance/noDelete: necessary for migration
		delete settings["primary-color"];
	}
	if (settings["background-color"] !== undefined) {
		settings.backgroundColor = settings["background-color"];
		// biome-ignore lint/performance/noDelete: necessary for migration
		delete settings["background-color"];
	}
	if (settings["transparency-depth"] !== undefined) {
		settings.transparencyDepth = settings["transparency-depth"];
		// biome-ignore lint/performance/noDelete: necessary for migration
		delete settings["transparency-depth"];
	}
	if (settings["blacklist-domain"] !== undefined) {
		// biome-ignore lint/performance/noDelete: necessary for migration
		delete settings["blacklist-domain"];
	}

	console.info("Migration complete!", settings);

	browser.storage.local.set({ transparentZenSettings: settings });
	return settings;
}
