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
import { qs, event, sleep, ce } from "../Utils/helperFunctions.js";
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
const tableHeaders = {
    current: "All",
    single: "<th>Theory</th><th>&sigma;<sub>t</sub></th><th>Last pub</th><th>Max Rho</th><th>&Delta;&tau;</th><th>Multi</th><th>Strat</th><th>&tau;/h</th><th>Pub Time</th>",
    all: "<th>&emsp;</th><th>Input</th><th>&tau;/h Active</th><th>&tau;/h Idle</th><th>Ratio</th><th>Multi Active</th><th>Multi Idle</th><th>Strat Active</th><th>Strat Idle</th><th>Time Active</th><th>Time Idle</th><th>&Delta;&tau; Active</th><th>&Delta;&tau; Idle</th>"
};
thead.innerHTML = tableHeaders.all;
table.classList.add("big");
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
    else
        output.textContent = "";
    if (res !== null && typeof res !== "string")
        updateTable(res);
    simulateButton.textContent = "Simulate";
}));
function updateTable(arr) {
    if (arr[0].length !== thead.children[0].children.length) {
        if (arr[0].length === 10) {
            thead.innerHTML = tableHeaders.single;
            table.classList.remove("big");
            table.classList.add("small");
            clearTable();
        }
    }
    for (let i = 0; i < arr.length; i++) {
        const row = ce("tr");
        for (let j = 0; j < thead.children[0].children.length; j++) {
            const cell = ce("td");
            cell.innerText = String(arr[i][j]);
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
    console.log(arr);
}
function clearTable() {
    while (tbody.firstChild)
        tbody.firstChild.remove();
}
