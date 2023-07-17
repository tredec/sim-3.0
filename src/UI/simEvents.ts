import { simulate, inputData, global } from "../Sim/main.js";
import { qs, event, sleep, ce, qsa, convertTime, logToExp } from "../Utils/helpers.js";
import { getSimState, setSimState } from "./simState.js";

//Inputs
const theory = qs<HTMLSelectElement>(".theory");
const strat = qs<HTMLSelectElement>(".strat");
const sigma = qs<HTMLInputElement>(".sigma");
const input = qs<HTMLInputElement>(".input");
const cap = qs<HTMLInputElement>(".cap");
const mode = qs<HTMLSelectElement>(".mode");
const modeInput = qs<HTMLInputElement>("textarea");
const timeDiffInputs = qsa<HTMLInputElement>(".timeDiffInput");
const hardCap = qs<HTMLInputElement>(".hardCap");
const semi_idle = qs<HTMLInputElement>(".semi-idle");
const hard_active = qs<HTMLInputElement>(".hard-active");

//Outputs
const output = qs(".output");
let table = qs(".simTable");
let thead = qs(".simTable > thead");
let tbody = qs(".simTable > tbody");

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
  all: `<th>&emsp;</th><th>Input</th><th>${tau}/h Active</th><th>${tau}/h Idle</th><th>Ratio</th><th>Multi Active</th><th>Multi Idle</th><th>Strat Active</th><th>Strat Idle</th><th>Time Active</th><th>Time Idle</th><th>&Delta;${tau} Active</th><th>&Delta;${tau} Idle</th>`,
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
    theory: theory.value as theoryType,
    strat: strat.value,
    sigma: sigma.value.replace(" ", ""),
    rho: input.value.replace(" ", ""),
    cap: cap.value.replace(" ", ""),
    mode: mode.value,
    modeInput: modeInput.value,
    simAllInputs: [semi_idle.checked, hard_active.checked],
    timeDiffInputs: [],
    hardCap: hardCap.checked,
  };
  for (const element of timeDiffInputs) {
    data.timeDiffInputs.push(element.value);
  }
  output.textContent = "";
  simulateButton.textContent = "Stop simulating";
  await sleep();
  const res = await simulate(data);
  if (typeof res === "string") output.textContent = res;
  else output.textContent = "";
  if (res !== null && typeof res !== "string") updateTable(res);
  simulateButton.textContent = "Simulate";
  global.simulating = false;
  setSimState();
});

function updateTable(arr: Array<Array<string>>): void {
  if (prevMode !== mode.value) clearTable();
  prevMode = mode.value;
  table = qs(".simTable");
  thead = qs(".simTable > thead");
  tbody = qs(".simTable > tbody");
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
  resetVarBuy();
}
function resetVarBuy() {
  tbody = qs(".simTable > tbody");
  for (let i = 0; i < global.varBuy.length; i++) {
    for (let j = 0; j < tbody?.children.length; j++) {
      const row = tbody?.children[j];
      if (parseFloat(row?.children[7].innerHTML) === global.varBuy[i][0]) {
        const val = global.varBuy[i][1];
        (<HTMLElement>row?.children[8]).onclick = () => {
          openVarModal(val);
        };
        (<HTMLElement>row?.children[8]).style.cursor = "pointer";
      }
    }
  }
  global.varBuy = [];
}
function openVarModal(arr: Array<varBuy>) {
  document.body.style.overflow = "hidden";
  (<HTMLDialogElement>qs(".boughtVars")).showModal();
  const tbody = qs(".boughtVarsOtp");
  while (tbody.firstChild) tbody.firstChild.remove();
  for (let i = 0; i < arr.length; i++) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    td1.innerText = arr[i].variable;
    tr.appendChild(td1);
    const td2 = document.createElement("td");
    td2.innerText = arr[i].level.toString();
    tr.appendChild(td2);
    const td3 = document.createElement("td");
    td3.innerHTML = `${logToExp(arr[i].cost, 2)}<span style="margin-left:.1em">${getCurrencySymbol(arr[i].symbol)}</span>`;
    tr.appendChild(td3);
    const td4 = document.createElement("td");
    td4.innerText = convertTime(arr[i].timeStamp);
    tr.appendChild(td4);
    tbody.appendChild(tr);
  }
}
function getCurrencySymbol(value: string | undefined): string {
  if (value === undefined || value === "rho") return "\u03C1";
  if (value === "lambda") return "\u03BB";
  if (/_/.test(value)) {
    value = value.replace(/{}/g, "");
    const split = value.split("_");
    return `${getCurrencySymbol(split[0])}<sub>${split[1]}</sub>`;
  }
  return value;
}
event(qs(".boughtVarsCloseBtn"), "pointerdown", () => {
  (<HTMLDialogElement>qs(".boughtVars")).close();
  document.body.style.overflow = "auto";
});
function clearTable(): void {
  while (tbody.firstChild) tbody.firstChild.remove();
}
