import { qs, event } from "../Utils/helperFunctions.js";
import { decimals, round } from "../Utils/simHelpers.js";

const settingsBtn = <HTMLButtonElement>qs(".settingsBtn");
const settingsCloseBtn = <HTMLButtonElement>qs(".settingsCloseBtn");
const settingsModal = <HTMLDialogElement>qs(".settings");

event(settingsBtn, "click", () => {
  settingsModal.showModal();
});

event(settingsCloseBtn, "click", () => {
  settingsModal.close();
});

const dtSlider = <HTMLInputElement>qs(".dt");
const dtOtp = qs(".dtOtp");

const ddtSlider = <HTMLInputElement>qs(".ddt");
const ddtOtp = qs(".ddtOtp");

event(
  dtSlider,
  "input",
  () => (dtOtp.textContent = dtSlider.value === "0" ? "0.1" : dtSlider.value === "10" ? "5" : String(decimals(0.1 + 2 ** parseFloat(dtSlider.value) * (4.9 / (1 + 2 ** parseFloat(dtSlider.max))), 4)))
);

event(
  ddtSlider,
  "input",
  () => (ddtOtp.textContent = ddtSlider.value === "0" ? "1" : ddtSlider.value === "10" ? "1.3" : String(round(1 + Number(decimals(3 ** parseFloat(ddtSlider.value) * (0.3 / 3 ** parseFloat(ddtSlider.max)), 2)), 7)))
);
