<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Browser } from "webextension-polyfill-ts";
import { DEFAULT_SETTINGS } from "../../shared/Constants";
import { getActivePageDomain } from "../../shared/MessageHelper";
import { getContentScripts, loadSettings } from "../../shared/StorageHelper";
import type { SupportedWebsite } from "../../types/ContentScripts";
import type { ExtensionSettings } from "../../types/ExtensionSettings";
import type { Manifest } from "../../types/Manifest";

declare const browser: Browser;

const manifest: Manifest = browser.runtime.getManifest();

const extensionSettings = ref<ExtensionSettings["transparentZenSettings"] | null>(null);
const supportedWebsites = ref<Array<SupportedWebsite>>([]);
const currentDomain = ref<string>();
const domainDisabled = ref(false);

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

const makeBooleanReadable = (value: boolean | undefined): string => {
	return value ? "Enabled" : "Disabled";
};

const getValueOrDefault = (key: keyof typeof DEFAULT_SETTINGS): string => {
	if ((extensionSettings.value?.[key] as string)?.length) {
		return extensionSettings.value?.[key] as string;
	}
	return DEFAULT_SETTINGS[key] as string;
};
</script>

<template>
  <header :style="{ '--color-primary': getValueOrDefault('primary-color') }">
    <div class="container">
      <div id="page-header">
        <img class="logo" src="../../../assets/images/logo_48.png" alt="Transparent Zen Logo">
        <h1 class="headline">{{manifest.name}}</h1>
        <span class="version">{{manifest.version}}</span>
      </div>
    </div>
  </header>
  <main :style="{ '--color-primary': getValueOrDefault('primary-color') }">
    <div class="container">
      <div class="settings">
        <section>
          <h2 class="headline">General Settings</h2>
          <p class="description">General settings for the extension</p>
          <div class="setting">
            <span class="label">Disabled Websites</span>
            <ul class="value-list">
              <li v-if="extensionSettings?.disabledWebsites?.length" v-for="website in extensionSettings?.disabledWebsites">
                {{ website.name }}
              </li>
              <span class="empty-list-text" v-else>You haven't disabled any websites</span>
            </ul>
          </div>
        </section>

        <section>
          <h2 class="headline">Dynamic Transparency</h2>
          <p class="description">Settings for the dynamic transparency</p>
          <div class="setting">
            <span class="label">Dynamic Transparency:</span>
            <span class="value">{{ makeBooleanReadable(extensionSettings?.["enable-transparency"]) }}</span>
          </div>
          <div class="setting">
            <span class="label">Disabled Domains</span>
            <ul class="value-list">
              <li v-if="extensionSettings?.blacklistedDomains?.length" v-for="domain in extensionSettings?.blacklistedDomains">
                {{ domain }}
              </li>
              <span class="empty-list-text" v-else>You haven't disabled any domains</span>
            </ul>
          </div>
        </section>

        <section>
          <h2 class="headline">Colors & Themes</h2>
          <p class="description">Configure the background colors and text colors for the websites.</p>
          <div class="setting">
            <span class="label">Text Color:</span>
            <span class="value" :style="`color: ${getValueOrDefault('text-color')}`">{{ getValueOrDefault("text-color") }}</span>
          </div>
          <div class="setting">
            <span class="label">Primary Color:</span>
            <span class="value" :style="`color: ${getValueOrDefault('primary-color')}`">{{ getValueOrDefault("primary-color") }}</span>
          </div>
          <div class="setting">
            <span class="label">Background Color:</span>
            <span class="value">{{ getValueOrDefault("background-color") }}</span>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>