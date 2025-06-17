<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRaw, useTemplateRef, watch } from "vue";
import { ColorPicker } from "vue3-colorpicker";
import type { Browser } from "webextension-polyfill-ts";
import { DEFAULT_SETTINGS, GITHUB_ENDPOINTS } from "../../shared/Constants";
import { getValidColorOrFallback } from "../../shared/Helper";
import { getActivePageDomain, sendMessageToActiveTabs, sendMessageToWorker } from "../../shared/MessageHelper";
import { getContentScripts, loadSettings, saveSettings } from "../../shared/StorageHelper";
import type { SupportedWebsite } from "../../types/ContentScripts";
import type { ExtensionSettings } from "../../types/ExtensionSettings";
import type { Manifest } from "../../types/Manifest";

declare const browser: Browser;

const manifest: Manifest = browser.runtime.getManifest();

const backgroundImageUrl = computed(() => URL.createObjectURL(extensionSettings.value?.backgroundImage as Blob));
const sortedWebsites = computed(() => {
	return supportedWebsites.value?.sort((a, b) => a.name.localeCompare(b.name)) ?? [];
});

const newDisabledDomainInput = useTemplateRef("newDisabledDomainInput");

const extensionSettings = ref<ExtensionSettings["transparentZenSettings"] | null>(null);
const supportedWebsites = ref<Array<SupportedWebsite>>([]);
const editingBlacklistedDomains = ref(false);
const newDisabledDomain = ref<string>("");
const currentDomain = ref<string>();
const domainDisabled = ref(false);
const latestVersion = ref<string>("");
const outdatedVersion = ref<boolean>(false);
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

	fetch(GITHUB_ENDPOINTS.LATEST_RELEASE).then(async (response) => {
		if (response.ok) {
			const data = await response.json();
			latestVersion.value = data?.name || "";
			if (data?.name !== manifest.version) {
				outdatedVersion.value = true;
			}
		}
	});
});

const getValueOrDefault = (key: keyof typeof DEFAULT_SETTINGS): string | number | null => {
	switch (key) {
		case "backgroundColor":
		case "primaryColor":
		case "textColor": {
			if (extensionSettings.value?.[key]?.length) {
				return extensionSettings.value[key];
			}
			return DEFAULT_SETTINGS[key];
		}

		case "transparencyDepth":
		case "backgroundImageOpacity":
		case "backgroundImageBlur":
		case "backgroundImageBrightness": {
			if (extensionSettings.value?.[key] !== undefined) {
				return extensionSettings.value[key] as number;
			}
			return DEFAULT_SETTINGS[key];
		}

		default: {
			return null;
		}
	}
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

const changeSetting = async (event: Event) => {
	if (!extensionSettings.value) return;

	const input = event.target as HTMLInputElement;
	switch (input.name) {
		case "enable-transparency":
			sendMessageToActiveTabs({ action: "toggleTransparency", enabled: input.checked });
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
		case "background-image-opacity":
			sendMessageToActiveTabs({ action: "changeBackgroundImageOpacity", value: getValueOrDefault("backgroundImageOpacity") as number });
			break;
		case "background-image-blur":
			sendMessageToActiveTabs({ action: "changeBackgroundImageBlur", value: getValueOrDefault("backgroundImageBlur") as number });
			break;
		case "background-image-brightness":
			sendMessageToActiveTabs({ action: "changeBackgroundImageBrightness", value: getValueOrDefault("backgroundImageBrightness") as number });
			break;
	}

	saveSettings(toRaw(extensionSettings.value));
};

const removeBlacklistedDomain = (domain: string) => {
	if (!extensionSettings.value) return;

	const index = extensionSettings.value.blacklistedDomains.indexOf(domain);
	if (index >= 0) {
		extensionSettings.value.blacklistedDomains.splice(index, 1);
		saveSettings(toRaw(extensionSettings.value));
	}
};

const addBlacklistedDomain = () => {
	if (!extensionSettings.value) return;

	if (newDisabledDomain.value?.length && !extensionSettings.value.blacklistedDomains.includes(newDisabledDomain.value)) {
		extensionSettings.value.blacklistedDomains.push(newDisabledDomain.value);
		saveSettings(toRaw(extensionSettings.value));
	}

	newDisabledDomain.value = "";
	editingBlacklistedDomains.value = false;
};

const showNewBlacklistedDomainInput = () => {
	editingBlacklistedDomains.value = true;
	nextTick(() => {
		newDisabledDomainInput.value?.focus();
	});
};

const hideNewBlacklistedDomainInput = () => {
	editingBlacklistedDomains.value = false;
	newDisabledDomain.value = "";
};

const toggleDynamicTransparency = () => {
	if (!extensionSettings.value) return;

	extensionSettings.value.enableTransparency = !extensionSettings.value.enableTransparency;
	saveSettings(toRaw(extensionSettings.value));
};

const uploadBackgroundImage = (event: Event) => {
	if (!extensionSettings.value) return;

	const target = event.target as HTMLInputElement;
	if (target.files && target.files.length > 0) {
		extensionSettings.value.backgroundImage = target.files[0];
		sendMessageToActiveTabs({ action: "changeBackgroundImage", value: extensionSettings.value.backgroundImage });
		saveSettings(toRaw(extensionSettings.value));
	}
};

const removeBackgroundImage = () => {
	if (!extensionSettings.value) return;

	extensionSettings.value.backgroundImage = null;
	sendMessageToActiveTabs({ action: "changeBackgroundImage", value: "" });
	saveSettings(toRaw(extensionSettings.value));
};
</script>

<template>
  <header :style="{ '--color-primary': getValueOrDefault('primaryColor') as string ?? '' }">
    <div class="container">
      <div id="page-header">
        <img class="logo" src="../../../assets/images/logo_48.png" alt="Transparent Zen Logo">
        <h1 class="headline">{{manifest.name}}</h1>
        <span class="version">{{manifest.version}}</span>
      </div>
    </div>
  </header>
  <main v-if="extensionSettings" :style="{ '--color-primary': getValueOrDefault('primaryColor') as string ?? '' }">
    <div class="container">
      <div class="settings">
        <section v-if="outdatedVersion" class="info-banner">
          <h2 class="headline">New Version Available!</h2>
          <p class="description">A new version of Transparent Zen is available: <strong>{{ latestVersion }}</strong>. Please update to the latest version for the best experience.</p>
          <div class="button-wrapper">
            <a class="button" href="https://addons.mozilla.org/en-US/firefox/addon/transparent-zen/">Mozilla Add-Ons</a>
            <a class="button" href="https://github.com/frostybiscuit/transparent-zen/releases/latest">GitHub Release</a>
          </div>
        </section>
        <section>
          <h2 class="headline">General Settings</h2>
          <p class="description">General settings for the extension.</p>
          <div class="setting">
            <span class="label">Supported Websites</span>
            <ul class="value-list" id="supported-websites-list">
              <li v-for="website in sortedWebsites" :key="website.name">
                <span class="website-name">
                  <img class="website-favicon" :src="website.favicon" alt="" role="presentation">
                  {{ website.name }}
                </span>
                <button type="button" class="toggle" :class="{active: extensionSettings.disabledWebsites.findIndex((site) => site.name === website.name) === -1}" @click="toggleSupportedWebsite(website)"></button>
              </li>
            </ul>
          </div>
          <div class="setting">
            <span class="label">Custom Background Image</span>
            <div class="value upload">
              <label>
                <input type="file" accept="image/*" @change="uploadBackgroundImage" />
                <div v-if="extensionSettings.backgroundImage" class="preview">
                  <img :src="backgroundImageUrl" alt="Custom Background Image" class="preview-image">
                  <span class="hover-overlay">
                    <img src="../../../assets/icons/pen.svg" alt="Change Background Image" class="change-icon" />
                    <img src="../../../assets/icons/x-mark.svg" alt="Remove Background Image" class="remove-icon" @click.prevent="removeBackgroundImage" />
                  </span>
                </div>
                <div v-else class="custom-upload">
                  <span class="button">Upload</span>
                  <span>No file uploaded</span>
                </div>
              </label>
            </div>
          </div>
          <div class="setting" v-if="extensionSettings.backgroundImage">
            <span class="label">Background Image Opacity</span>
            <div class="value">
              <input
                type="range"
                min="0" max="100"
                name="background-image-opacity"
                v-model.number="extensionSettings.backgroundImageOpacity"
                :placeholder="String(DEFAULT_SETTINGS.backgroundImageOpacity)"
                @change="changeSetting">
              <span class="range-value">{{ extensionSettings.backgroundImageOpacity }}%</span>
            </div>
          </div>
          <div class="setting" v-if="extensionSettings.backgroundImage">
            <span class="label">Background Image Blur</span>
            <div class="value">
              <input
                type="range"
                min="0" max="100"
                name="background-image-blur"
                v-model.number="extensionSettings.backgroundImageBlur"
                :placeholder="String(DEFAULT_SETTINGS.backgroundImageBlur)"
                @change="changeSetting">
              <span class="range-value">{{ extensionSettings.backgroundImageBlur }}px</span>
            </div>
          </div>
          <div class="setting" v-if="extensionSettings.backgroundImage">
            <span class="label">Background Image Brightness</span>
            <div class="value">
              <input
                type="range"
                min="0" max="100"
                name="background-image-brightness"
                v-model.number="extensionSettings.backgroundImageBrightness"
                :placeholder="String(DEFAULT_SETTINGS.backgroundImageBrightness)"
                @change="changeSetting">
              <span class="range-value">{{ extensionSettings.backgroundImageBrightness }}%</span>
            </div>
          </div>
        </section>

        <section>
          <h2 class="headline">
            <span>Dynamic Transparency</span>
            <button type="button" class="toggle" :class="{active: extensionSettings.enableTransparency}" @click="toggleDynamicTransparency"></button>
          </h2>
          <p class="description">
            Enabling this will enable an experimental approach to make any website transparent by crawling the site to remove backgrounds and adapt colors to keep it as readable and usable as possible.<br/>
            <strong>Please keep in mind that this might not work for some websites, especially with more complex elements as well as overlays and modals!</strong>
          </p>
          <div class="setting" :class="{disabled: !extensionSettings.enableTransparency}">
            <span class="label">Background Layers</span>
            <div class="value">
              <input
                type="number"
                min="1" max="10"
                name="transparency-depth"
                v-model.number="extensionSettings.transparencyDepth"
                :placeholder="String(DEFAULT_SETTINGS.transparencyDepth)"
                @change="changeSetting">
            </div>
          </div>
          <div class="setting" :class="{disabled: !extensionSettings.enableTransparency}">
            <span class="label">Blacklisted Domains</span>
            <ul class="value-list">
              <li v-if="extensionSettings.blacklistedDomains?.length" v-for="domain in extensionSettings.blacklistedDomains">
                {{ domain }}
                <button type="button" class="remove-button" @click="removeBlacklistedDomain(domain)">
                  <img src="../../../assets/icons/x-mark.svg" alt="Remove Domain" />
                </button>
              </li>
              <li class="add-domain">
                <button v-if="!editingBlacklistedDomains" type="button" class="add-button" @click="showNewBlacklistedDomainInput">
                  <img src="../../../assets/icons/plus.svg" alt="Add Domain" />
                </button>
                <input v-else type="text" placeholder="www.example.com" v-model="newDisabledDomain" @change="addBlacklistedDomain" @blur="hideNewBlacklistedDomainInput" ref="newDisabledDomainInput" />
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 class="headline">Colors & Themes</h2>
          <p class="description">Adjust the background and text colors used on all websites.</p>
          <div class="setting">
            <span class="label">Text Color</span>
            <span class="value">
              <div class="color-picker-container">
                <input
                  type="text"
                  v-model="extensionSettings.textColor"
                  :placeholder="DEFAULT_SETTINGS.textColor"
                  @change="changeSetting">
                <ColorPicker theme="black" v-model:pureColor="colorPickerTextColor" @update:pureColor="pickColor('textColor')" />
              </div>
            </span>
          </div>
          <div class="setting">
            <span class="label">Primary Color</span>
            <span class="value">
              <div class="color-picker-container">
                <input
                  type="text"
                  v-model="extensionSettings.primaryColor"
                  :placeholder="DEFAULT_SETTINGS.primaryColor"
                  @change="changeSetting">
                <ColorPicker theme="black" v-model:pureColor="colorPickerPrimaryColor" @update:pureColor="pickColor('primaryColor')" />
              </div>
            </span>
          </div>
          <div class="setting">
            <span class="label">Background Color</span>
            <span class="value">
              <div class="color-picker-container">
                <input
                  type="text"
                  v-model="extensionSettings.backgroundColor"
                  :placeholder="DEFAULT_SETTINGS.backgroundColor"
                  @change="changeSetting">
                <ColorPicker theme="black" v-model:pureColor="colorPickerBackgroundColor" @update:pureColor="pickColor('backgroundColor')" />
              </div>
            </span>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>