import { simulate, inputData } from "../main.js";
import { qs, event, sleep } from "../Utils/helperFunctions.js";
import { simResult } from "../Utils/simHelpers.js";

//Inputs
const theory = <HTMLSelectElement>qs(".theory");
const strat = <HTMLSelectElement>qs(".strat");
const sigma = <HTMLInputElement>qs(".sigma");
const input = <HTMLInputElement>qs(".input");
const cap = <HTMLInputElement>qs(".cap");
const mode = <HTMLSelectElement>qs(".mode");
const modeInput = <HTMLInputElement>qs("textarea");
const hardCap = <HTMLInputElement>qs(".hardCap");

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



event(simulateButton, "click", async () => {
  const data: inputData = {
    theory: theory.value,
    strat: strat.value,
    sigma: sigma.value,
    rho: input.value,
    cap: cap.value,
    mode: mode.value,
    modeInput: modeInput.value,
    hardCap: hardCap.checked,
    global: { dt: parseFloat(dtOtp.textContent ?? "1.5"), ddt: parseFloat(ddtOtp.textContent ?? "1.0001"), stratFilter: true }
  };
  output.textContent = "";
  simulateButton.textContent = "Stop simulating";
  await sleep();
  let res = await simulate(data);
  if (typeof res === "string") output.textContent = res;
  else if (res !== null) updateTable(res);
  simulateButton.textContent = "Simulate";
});

function updateTable(arr: Array<simResult>) {
  // let mode
  // if(thead.innerHTML === )
  console.log(arr);
}

function clearTable():void{
  while(tbody.firstChild)tbody.firstChild.remove()
}