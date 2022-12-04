import { simulate, inputData, global } from "../Sim/main.js";
import { qs, event, sleep, ce, qsa } from "../Utils/helperFunctions.js";
import { simResult } from "../Utils/simHelpers.js";
import { getSimState, setSimState } from "./simState.js";

//Inputs
const theory = <HTMLSelectElement>qs(".theory");
const strat = <HTMLSelectElement>qs(".strat");
const sigma = <HTMLInputElement>qs(".sigma");
const input = <HTMLInputElement>qs(".input");
const cap = <HTMLInputElement>qs(".cap");
const mode = <HTMLSelectElement>qs(".mode");
const modeInput = <HTMLInputElement>qs("textarea");
const hardCap = <HTMLInputElement>qs(".hardCap");
const semi_idle = <HTMLInputElement>qs(".semi-idle");
const hard_active = <HTMLInputElement>qs(".hard-active");

//Outputs
const output = qs(".output");
let table = qs("table");
let thead = qs("thead");
let tbody = qs("tbody");

//Buttons
const simulateButton = qs(".simulate");

//Setting Inputs
const dtOtp = qs(".dtOtp");
const ddtOtp = qs(".ddtOtp");
const showA23 = <HTMLInputElement>qs(".a23");

let prevMode = "All";

const tau = `<span style="font-size:0.9rem; font-style:italics">&tau;</span>`;

const tableHeaders = {
  current: "All",
  single: `<th style="padding-inline: 0.5rem !important">Theory</th><th><span style="font-size:0.9rem;">&sigma;</span><sub>t</sub></th><th>Last Pub</th><th>Max Rho</th><th>&Delta;${tau}</th><th>Multi</th><th>Strat</th><th>${tau}/h</th><th>Pub Time</th>`,
  all: `<th>&emsp;</th><th>Input</th><th>${tau}/h Active</th><th>${tau}/h Idle</th><th>Ratio</th><th>Multi Active</th><th>Multi Idle</th><th>Strat Active</th><th>Strat Idle</th><th>Time Active</th><th>Time Idle</th><th>&Delta;${tau} Active</th><th>&Delta;${tau} Idle</th>`
};
thead.innerHTML = tableHeaders.all;
table.classList.add("big");

if (localStorage.getItem("autoSave") === "true") setTimeout(() => getSimState(), 500);

event(simulateButton, "click", async () => {
  global.dt = parseFloat(dtOtp.textContent ?? "1.5");
  global.ddt = parseFloat(ddtOtp.textContent ?? "1.0001");
  global.stratFilter = true;
  global.showA23 = showA23.checked;
  localStorage.setItem("simAllSettings", JSON.stringify([semi_idle.checked, hard_active.checked]));
  const data: inputData = {
    theory: theory.value,
    strat: strat.value,
    sigma: sigma.value.replace(" ", ""),
    rho: input.value.replace(" ", ""),
    cap: cap.value.replace(" ", ""),
    mode: mode.value,
    modeInput: modeInput.value,
    simAllInputs: [semi_idle.checked, hard_active.checked],
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
  setSimState();
});

function updateTable(arr: Array<simResult>): void {
  if (prevMode !== mode.value) clearTable();
  prevMode = mode.value;
  table = qs("table");
  thead = qs("thead");
  tbody = qs("tbody");
  if (mode.value === "All") {
    table.classList.add("big");
    table.classList.remove("small");
    thead.innerHTML = tableHeaders.all;
    thead.children[0].children[0].innerHTML = arr[arr.length - 1][0].toString() + '<span style="font-size:0.9rem;">&sigma;</span><sub>t</sub>';
    arr.pop();
  } else {
    table.classList.remove("big");
    table.classList.add("small");
    thead.innerHTML = tableHeaders.single;
  }
  if ((tbody.children.length > 1 && (arr.length > 1 || tbody.children[tbody.children.length - 1].children[0].innerHTML === "")) || mode.value === "All") clearTable();

  for (let i = 0; i < arr.length; i++) {
    const row = <HTMLTableRowElement>ce("tr");
    for (let j = 0; j < thead.children[0].children.length; j++) {
      const cell = ce("td");
      cell.innerHTML = String(arr[i][j]);
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
}

function clearTable(): void {
  while (tbody.firstChild) tbody.firstChild.remove();
}
