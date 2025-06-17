<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from "vue";
import { ColorPicker } from "vue3-colorpicker";
import type { Browser } from "webextension-polyfill-ts";
import { DEFAULT_SETTINGS } from "../../shared/Constants";
import { getValidColorOrFallback } from "../../shared/Helper";
import { getActivePageDomain, sendMessageToActiveTabs, sendMessageToWorker } from "../../shared/MessageHelper";
import { getContentScripts, loadSettings, saveSettings } from "../../shared/StorageHelper";
import type { SupportedWebsite } from "../../types/ContentScripts";
import type { ExtensionSettings } from "../../types/ExtensionSettings";
import type { Manifest } from "../../types/Manifest";

declare const browser: Browser;
let inputDebounce: number;

const manifest: Manifest = browser.runtime.getManifest();

const extensionSettings = ref<ExtensionSettings["transparentZenSettings"] | null>(null);
const supportedWebsites = ref<Array<SupportedWebsite>>([]);
const showAllWebsites = ref(false);
const currentDomain = ref<string>();
const domainDisabled = ref(false);

const colorPickerTextColor = ref("");
const colorPickerPrimaryColor = ref("");
const colorPickerBackgroundColor = ref("");

// biome-ignore format: readability
watch(() => extensionSettings.value?.textColor, newValue => {
	colorPickerTextColor.value = newValue?.length ? newValue : DEFAULT_SETTINGS.textColor;
});
// biome-ignore format: readability
watch(() => extensionSettings.value?.primaryColor, newValue => {
	colorPickerPrimaryColor.value = newValue?.length ? newValue : DEFAULT_SETTINGS.primaryColor;
});
// biome-ignore format: readability
watch(() => extensionSettings.value?.backgroundColor, newValue => {
	colorPickerBackgroundColor.value = newValue?.length ? newValue : DEFAULT_SETTINGS.backgroundColor;
});

const primaryColor = computed(() => {
	const value = getValidColorOrFallback(extensionSettings.value?.primaryColor, DEFAULT_SETTINGS.primaryColor);
	return `--color-primary: ${value};`;
});
const sortedWebsites = computed(() => {
	return supportedWebsites.value?.sort((a, b) => a.name.localeCompare(b.name)) ?? [];
});

onMounted(() => {
	loadSettings().then(async (settings) => {
		extensionSettings.value = { ...DEFAULT_SETTINGS, ...settings };
		console.info("Extension settings loaded", settings);
		getContentScripts().then((contentScripts) => {
			supportedWebsites.value = contentScripts?.supportedWebsites || [];
		});
		currentDomain.value = await getActivePageDomain();
		if (currentDomain.value !== undefined && currentDomain.value !== null) {
			if (extensionSettings.value?.blacklistedDomains) {
				domainDisabled.value = extensionSettings.value?.blacklistedDomains.indexOf(currentDomain.value) >= 0;
			}
		}
	});
});

const changeSetting = (event: Event) => {
	if (inputDebounce) {
		clearTimeout(inputDebounce);
	}

	inputDebounce = setTimeout(async () => {
		const input = event.target as HTMLInputElement;
		switch (input.name) {
			case "enable-transparency":
				sendMessageToActiveTabs({ action: "toggleTransparency", enabled: input.checked });
				break;
			case "blacklist-domain":
				await toggleDomainBlacklist(input.checked);
				sendMessageToActiveTabs({ action: "toggleTransparency", enabled: !input.checked });
				break;
			case "text-color":
				sendMessageToActiveTabs({ action: "changeTextColor", value: getValidColorOrFallback(input.value, DEFAULT_SETTINGS.textColor) });
				break;
			case "primary-color":
				sendMessageToActiveTabs({ action: "changePrimaryColor", value: getValidColorOrFallback(input.value, DEFAULT_SETTINGS.primaryColor) });
				break;
			case "background-color":
				sendMessageToActiveTabs({ action: "changeBackgroundColor", value: getValidColorOrFallback(input.value, DEFAULT_SETTINGS.backgroundColor) });
				break;
		}

		saveSettings(toRaw(extensionSettings.value));
	}, 500);
};

const toggleDomainBlacklist = async (enabled: boolean) => {
	const domain = await getActivePageDomain();
	if (!domain) return false;

	const indexOfDomain = extensionSettings.value?.blacklistedDomains.indexOf(domain);
	if (indexOfDomain === undefined) return false;

	if (enabled) {
		indexOfDomain === -1 && extensionSettings.value?.blacklistedDomains.push(domain);
	} else {
		extensionSettings.value?.blacklistedDomains.splice(indexOfDomain, 1);
	}
};

const toggleSupportedWebsite = (website: SupportedWebsite) => {
	if (!extensionSettings.value) return;

	const toggledWebsiteIndex = extensionSettings.value.disabledWebsites.findIndex((site) => site.name === website.name);
	const isCurrentlyActive = toggledWebsiteIndex === -1;
	const rawWebsite = toRaw(website);
	if (isCurrentlyActive) {
		extensionSettings.value.disabledWebsites.push(website);
		sendMessageToWorker({ action: "removeStyles", filePath: rawWebsite.css?.[0] });
	} else {
		extensionSettings.value.disabledWebsites.splice(toggledWebsiteIndex, 1);
		sendMessageToWorker({ action: "insertStyles", filePath: rawWebsite.css?.[0], domains: rawWebsite.matches });
	}

	saveSettings(toRaw(extensionSettings.value));
};

const pickColor = (name: string) => {
	if (!extensionSettings.value) return;
	switch (name) {
		case "textColor":
			extensionSettings.value[name] = colorPickerTextColor.value;
			sendMessageToActiveTabs({ action: "changeTextColor", value: colorPickerTextColor.value });
			break;
		case "primaryColor":
			extensionSettings.value[name] = colorPickerPrimaryColor.value;
			sendMessageToActiveTabs({ action: "changePrimaryColor", value: colorPickerPrimaryColor.value });
			break;
		case "backgroundColor":
			extensionSettings.value[name] = colorPickerBackgroundColor.value;
			sendMessageToActiveTabs({ action: "changeBackgroundColor", value: colorPickerBackgroundColor.value });
			break;
	}

	saveSettings(toRaw(extensionSettings.value));
};

const openSettingsPage = () => {
	browser.runtime.openOptionsPage();
};
</script>

<template>
  <div class="container" :style="primaryColor">
    <header id="extension-header">
      <!-- <img class="logo" src="../assets/images/logo_48.png" alt="Transparent Zen Logo"> -->
      <h1 class="headline">{{manifest.name}}</h1>
      <span class="version">{{manifest.version}}</span>
		</header>
    <main id="extension-body" v-if="extensionSettings">
      <section>
				<h2 class="headline">Settings</h2>
				<form id="extension-settings">
					<label class="setting">
						<input type="checkbox" name="enable-transparency" v-model="extensionSettings.enableTransparency" @input="changeSetting">
						<span class="custom-checkbox"></span>
						Enable Dynamic Transparency for all websites (experimental)
					</label>
					<div class="settings-group" data-depends-on="enable-transparency" v-show="extensionSettings.enableTransparency">
						<label class="setting">
							<input type="checkbox" name="blacklist-domain" :checked="domainDisabled" @input="changeSetting">
							<span class="custom-checkbox"></span>
							Disable for this domain
						</label>
					</div>
					<div class="setting">
						<label for="text-color">Text Color</label>
						<div class="color-picker-container">
							<input
								type="text"
								name="text-color"
								id="text-color"
								v-model="extensionSettings.textColor"
								:placeholder="DEFAULT_SETTINGS.textColor"
								@input="changeSetting">
							<ColorPicker theme="black" :blur-close="true" v-model:pureColor="colorPickerTextColor" @update:pureColor="pickColor('textColor')" />
						</div>
					</div>
					<div class="setting">
						<label for="primary-color">Primary Color</label>
						<div class="color-picker-container">
							<input
								type="text"
								name="primary-color"
								id="primary-color"
								v-model="extensionSettings.primaryColor"
								:placeholder="DEFAULT_SETTINGS.primaryColor"
								@input="changeSetting">
							<ColorPicker theme="black" :blur-close="true" v-model:pureColor="colorPickerPrimaryColor" @update:pureColor="pickColor('primaryColor')" />
						</div>
					</div>
					<div class="setting">
						<label for="background-color">Background Color</label>
						<div class="color-picker-container">
							<input
								type="text"
								name="background-color"
								id="background-color"
								v-model="extensionSettings.backgroundColor"
								:placeholder="DEFAULT_SETTINGS.backgroundColor"
								@input="changeSetting">
							<ColorPicker theme="black" :blur-close="true" v-model:pureColor="colorPickerBackgroundColor" @update:pureColor="pickColor('backgroundColor')" />
						</div>
					</div>
					<label class="setting">
						Background Layers (requires reload)
						<input
							type="number"
							name="transparency-depth"
							v-model="extensionSettings.transparencyDepth" min="1" max="10"
							:placeholder="DEFAULT_SETTINGS.transparencyDepth?.toString()"
							@input="changeSetting">
					</label>
				</form>
				<div class="button-wrapper">
					<button @click="openSettingsPage">Show all settings</button>
				</div>
			</section>
      <section id="supported-websites">
        <h2 class="headline">Officially Supported Websites:</h2>
        <ul data-content="supported-sites" :class="{open: showAllWebsites}">
          <li v-for="website in sortedWebsites" :key="website.name">
            <span class="website-name">
							<img class="website-favicon" :src="website.favicon" alt="" role="presentation">
							{{ website.name }}
						</span>
            <button type="button" class="toggle" :class="{active: extensionSettings.disabledWebsites.findIndex((site) => site.name === website.name) === -1}" @click="toggleSupportedWebsite(website)"></button>
          </li>
        </ul>
        <div class="button-wrapper" v-if="!showAllWebsites">
          <button class="show-all" type="button" data-target="supported-sites" @click="showAllWebsites = true">Show all</button>
        </div>
      </section>
    </main>
		<footer id="extension-footer">
			<p>Transparent Zen is open source and everyone can contribute their custom styles to support more websites.</p>
			<a href="https://github.com/frostybiscuit/transparent-zen">GitHub Repository</a>
		</footer>
  </div>
</template>