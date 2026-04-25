import type { Browser } from "webextension-polyfill-ts";
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
	}
});

async function applyStyles(filePath?: string, domains?: Array<string>) {
	const tabs = await browser.tabs.query({ currentWindow: true });

	for (const tab of tabs) {
		if (!tab.id || !tab.url) continue;
		if (tab.discarded) continue;
		if (tabs.length > 40 && !tab.active) continue;
		if (domains) {
			for (const domain of domains) {
				const regex = new RegExp(domain);
				if (tab.url && regex.test(tab.url)) {
					browser.tabs.insertCSS(tab.id, { file: filePath });
				}
			}
		} else if (!tab.url.startsWith("moz-extension://")) {
			browser.tabs.insertCSS(tab.id, { file: filePath });
		}
	}
}
