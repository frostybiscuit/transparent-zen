import type { Browser } from "webextension-polyfill-ts";
import type { Message } from "../types/Message";
import type { Response } from "../types/Response";

declare const browser: Browser;

export const sendMessageToWorker = (message: Message): void => {
	browser.runtime.sendMessage(message);
};

export const sendMessageToActiveTabs = async (message: Message): Promise<Array<Response> | null> => {
	const tabs = await browser.tabs.query({
		currentWindow: true,
		active: true,
	});

	const responses: Array<Response> | null = await Promise.all(
		tabs.map(async (tab) => {
			const response: string = await browser.tabs.sendMessage(tab.id as number, message);
			return { tabId: tab.id, response };
		}),
	);

	return responses;
};

export const getActivePageDomain = async (): Promise<string | undefined> => {
	const tabResponses = await sendMessageToActiveTabs({ action: "getDomain" });
	return tabResponses?.[0]?.response;
};
