import { qs, event } from "../Utils/helperFunctions.js";
import { decimals, round } from "../Utils/simHelpers.js";
const settingsBtn = qs(".settingsBtn");
const settingsCloseBtn = qs(".settingsCloseBtn");
const settingsModal = qs(".settings");
event(settingsBtn, "click", () => {
    settingsModal.showModal();
});
event(settingsCloseBtn, "click", () => {
    settingsModal.close();
});
const dtSlider = qs(".dt");
const dtOtp = qs(".dtOtp");
const ddtSlider = qs(".ddt");
const ddtOtp = qs(".ddtOtp");
event(dtSlider, "input", () => (dtOtp.textContent = dtSlider.value === "0" ? "0.1" : dtSlider.value === "10" ? "5" : String(decimals(0.1 + Math.pow(2, parseFloat(dtSlider.value)) * (4.9 / (1 + Math.pow(2, parseFloat(dtSlider.max)))), 4))));
event(ddtSlider, "input", () => (ddtOtp.textContent = ddtSlider.value === "0" ? "1" : ddtSlider.value === "10" ? "1.3" : String(round(1 + Number(decimals(Math.pow(3, parseFloat(ddtSlider.value)) * (0.3 / Math.pow(3, parseFloat(ddtSlider.max))), 2)), 7))));
