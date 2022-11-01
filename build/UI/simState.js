import { qs } from "../Utils/helperFunctions.js";
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
//Setting Inputs
const dtOtp = qs(".dtOtp");
const ddtOtp = qs(".ddtOtp");
const defaultState = `{"controls1":{"theory":{"value":"T1","innerHTML":"<option value=\\"T1\\">T1</option><option value=\\"T2\\">T2</option><option value=\\"T3\\">T3</option><option value=\\"T4\\">T4</option><option value=\\"T5\\">T5</option><option value=\\"T6\\">T6</option><option value=\\"T7\\">T7</option><option value=\\"T8\\">T8</option><option value=\\"WSP\\">WSP</option><option value=\\"SL\\">SL</option><option value=\\"EF\\">EF</option><option value=\\"CSR2\\">CSR2</option><option value=\\"PD\\">PD</option><option value=\\"FI\\">FI</option>"},"strat":{"value":"Best Overall","innerHTML":"\\n            <option value=\\"Best Overall\\">Best Overall</option>\\n            <option value=\\"Best Active\\">Best Active</option>\\n            <option value=\\"Best Semi-Idle\\">Best Semi-Idle</option>\\n            <option value=\\"Best Idle\\">Best Idle</option>\\n          <option value=\\"T1\\">T1</option><option value=\\"T1C34\\">T1C34</option><option value=\\"T1C4\\">T1C4</option><option value=\\"T1Ratio\\">T1Ratio</option><option value=\\"T1SolarXLII\\">T1SolarXLII</option>"},"sigma":"","input":"","cap":false},"controls2":{"mode":"All","modeInput":"","extraInputDescription":"","hardCap":"on","timeDiffInputs":["","",""]},"output":"","table":"\\n<thead><tr><th> </th><th>Input</th><th>τ/h Active</th><th>τ/h Idle</th><th>Ratio</th><th>Multi Active</th><th>Multi Idle</th><th>Strat Active</th><th>Strat Idle</th><th>Time Active</th><th>Time Idle</th><th>Δτ Active</th><th>Δτ Idle</th></tr></thead>\\n        <tbody></tbody>\\n      ","settings":{"dt":"1.5","ddt":"1.0001"}}`;
export function setSimState() {
    localStorage.setItem("simState", JSON.stringify({
        controls1: {
            theory: { value: theory.value, innerHTML: theory.innerHTML },
            strat: { value: strat.value, innerHTML: strat.innerHTML },
            sigma: sigma.value,
            input: input.value,
            cap: cap.checked
        },
        controls2: {
            mode: mode.value,
            modeInput: modeInput.value,
            extraInputDescription: qs(".extraInputDescription").textContent,
            hardCap: hardCap.value,
            timeDiffInputs: [qs(".timeDiffWrapper").children[0].value, qs(".timeDiffWrapper").children[1].value, qs(".timeDiffWrapper").children[2].value]
        },
        output: output.textContent,
        table: table.innerHTML,
        settings: {
            dt: dtOtp.textContent,
            ddt: ddtOtp.textContent
        }
    }));
}
export function getSimState() {
    var _a;
    const state = JSON.parse((_a = localStorage.getItem("simState")) !== null && _a !== void 0 ? _a : defaultState);
}
