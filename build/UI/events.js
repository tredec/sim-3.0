import { simulate } from "../main.js";
import { qs, event } from "../Utils/helperFunctions.js";
import { decimals, round } from "../Utils/simHelpers.js";
//Inputs
const theory = qs(".theory");
const strat = qs(".strat");
const sigma = qs(".sigma");
const input = qs(".input");
const cap = qs(".cap");
const mode = qs(".mode");
const modeInput = qs("textarea");
const hardCap = qs(".hardCap");
//Outputs
const output = qs(".output");
const table = qs(".table");
//Buttons
const simulateButton = qs(".simulate");
event(simulateButton, "click", () => {
    const data = {
        theory: theory.value,
        strat: strat.value,
        sigma: sigma.value,
        rho: input.value,
        cap: cap.value,
        mode: mode.value,
        modeInput: modeInput.value,
        hardCap: hardCap.checked
    };
    try {
        simulate(data);
        output.textContent = "";
    }
    catch (error) {
        output.textContent = error;
    }
});
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
