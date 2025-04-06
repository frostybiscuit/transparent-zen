browser.runtime.onMessage.addListener((message) => {
	switch (message.action) {
		case "insertStyles":
			applyStyles(message.filePath, message.domains);
			break;

		case "removeStyles":
			browser.tabs.removeCSS({ file: message.filePath });
			break;
	}
});

async function applyStyles(filePath, domains) {
	const tabs = await browser.tabs.query({
		currentWindow: true,
		active: true,
	});

	for (const tab of tabs) {
		for (const domain of domains) {
			if (matchesHref(tab.url, domain)) {
				browser.tabs.insertCSS(tab.id, { file: filePath });
			}
		}
	}
}

function wildcardToRegex(pattern) {
	return new RegExp(pattern.replace(/\./, ".?").replaceAll(/\*/g, "[^ ]*"));
}

function matchesHref(href, pattern) {
	const regex = this.wildcardToRegex(pattern);
	return regex.test(href);
}
