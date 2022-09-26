import { simulate, inputData, global } from "../main.js";
import { qs, event, sleep, ce, qsa } from "../Utils/helperFunctions.js";
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

const tableHeaders = {
  current: "All",
  single: `<th style="padding-inline: 0.5rem !important">Theory</th><th><b style="font-size: 1rem">&sigma;</b><sub>t</sub></th><th>Last Pub</th><th>Max Rho</th><th>&Delta;<i style="font-size:1rem">&tau;</i></th><th>Multi</th><th>Strat</th><th><i style="font-size:1rem">&tau;</i>/h</th><th>Pub Time</th>`,
  all: "<th>&emsp;</th><th>Input</th><th>&tau;/h Active</th><th>&tau;/h Idle</th><th>Ratio</th><th>Multi Active</th><th>Multi Idle</th><th>Strat Active</th><th>Strat Idle</th><th>Time Active</th><th>Time Idle</th><th>&Delta;&tau; Active</th><th>&Delta;&tau; Idle</th>"
};
thead.innerHTML = tableHeaders.all;
table.classList.add("big");

event(simulateButton, "click", async () => {
  global.dt = parseFloat(dtOtp.textContent ?? "1.5");
  global.ddt = parseFloat(ddtOtp.textContent ?? "1.0001");
  global.stratFilter = true;
  const data: inputData = {
    theory: theory.value,
    strat: strat.value,
    sigma: sigma.value,
    rho: input.value,
    cap: cap.value,
    mode: mode.value,
    modeInput: modeInput.value,
    hardCap: hardCap.checked
  };
  output.textContent = "";
  simulateButton.textContent = "Stop simulating";
  await sleep();
  let res = await simulate(data);
  if (typeof res === "string") output.textContent = res;
  else output.textContent = "";
  if (res !== null && typeof res !== "string") updateTable(res);
  simulateButton.textContent = "Simulate";
  global.simulating = false;
});

function updateTable(arr: Array<simResult>): void {
  if (arr[0].length !== thead.children[0].children.length) {
    if (arr[0].length === 10) {
      thead.innerHTML = tableHeaders.single;
      table.classList.remove("big");
      table.classList.add("small");
      clearTable();
    }
  }
  for (let i = 0; i < arr.length; i++) {
    const row = <HTMLTableRowElement>ce("tr");
    for (let j = 0; j < thead.children[0].children.length; j++) {
      const cell = ce("td");
      cell.innerText = String(arr[i][j]);
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
}

function clearTable(): void {
  while (tbody.firstChild) tbody.firstChild.remove();
}
