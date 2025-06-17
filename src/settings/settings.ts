import { createApp } from "vue";
import Vue3ColorPicker from "vue3-colorpicker";
import "vue3-colorpicker/style.css";
import Settings from "./components/Settings.vue";

const settings = createApp(Settings);
settings.use(Vue3ColorPicker);
settings.mount("#settings");
