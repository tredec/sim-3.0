var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { simulate } from "../main.js";
import { qs, event, sleep } from "../Utils/helperFunctions.js";
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
const table = qs("table");
const thead = qs("thead");
const tbody = qs("tbody");
//Buttons
const simulateButton = qs(".simulate");
//Setting Inputs
const dtOtp = qs(".dtOtp");
const ddtOtp = qs(".ddtOtp");
event(simulateButton, "click", () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const data = {
        theory: theory.value,
        strat: strat.value,
        sigma: sigma.value,
        rho: input.value,
        cap: cap.value,
        mode: mode.value,
        modeInput: modeInput.value,
        hardCap: hardCap.checked,
        global: { dt: parseFloat((_a = dtOtp.textContent) !== null && _a !== void 0 ? _a : "1.5"), ddt: parseFloat((_b = ddtOtp.textContent) !== null && _b !== void 0 ? _b : "1.0001"), stratFilter: true }
    };
    output.textContent = "";
    simulateButton.textContent = "Stop simulating";
    yield sleep();
    let res = yield simulate(data);
    if (typeof res === "string")
        output.textContent = res;
    else if (res !== null)
        updateTable(res);
    simulateButton.textContent = "Simulate";
}));
function updateTable(arr) {
    // let mode
    // if(thead.innerHTML === )
    console.log(arr);
}
function clearTable() {
    while (tbody.firstChild)
        tbody.firstChild.remove();
}
