import { createApp } from "vue";
import Vue3ColorPicker from "vue3-colorpicker";
import "vue3-colorpicker/style.css";
import Popup from "./components/Popup.vue";

const popup = createApp(Popup);
popup.use(Vue3ColorPicker);
popup.mount("#popup");
