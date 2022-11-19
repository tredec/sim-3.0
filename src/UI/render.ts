import { qs, qsa, event, ce, findIndex } from "../Utils/helperFunctions.js";
import data from "../Sim/data.json" assert { type: "json" };

//Inputs
const theory = <HTMLSelectElement>qs(".theory");
const strat = <HTMLSelectElement>qs(".strat");
const sigma = <HTMLInputElement>qs(".sigma");
const input = <HTMLInputElement>qs(".input");
const cap = <HTMLInputElement>qs(".cap");
const mode = <HTMLSelectElement>qs(".mode");
const modeInput = <HTMLInputElement>qs("textarea");
const hardCap = qs(".hardCap");
const semi_idle = <HTMLInputElement>qs(".semi-idle");
const hard_active = <HTMLInputElement>qs(".hard-active");

//Other containers/elements
const extraInputs = qs(".extraInputs");
const timeDiffWrapper = qs(".timeDiffWrapper");
const singleInput = <HTMLDivElement>qsa(".controls")[0];
const simAllInputs = qs(".simAllInputs");
const modeInputDescription = qs(".extraInputDescription");

//Renders theories, strats and modes options on page load

window.onload = () => {
  for (let i = 0; i < data.theories.length; i++) {
    const option = <HTMLSelectElement>ce("option");
    option.value = data.theories[i];
    option.textContent = data.theories[i];
    theory.appendChild(option);
  }
  for (let i = 0; i < data.strats[0].length; i++) {
    const option = <HTMLSelectElement>ce("option");
    option.value = data.strats[0][i];
    option.textContent = data.strats[0][i];
    strat.appendChild(option);
  }
  for (let i = 0; i < data.modes.length; i++) {
    const option = <HTMLSelectElement>ce("option");
    option.value = data.modes[i];
    option.textContent = data.modes[i];
    mode.appendChild(option);
  }
  modeUpdate();
};

event(mode, "input", modeUpdate);

export function modeUpdate(): void {
  singleInput.style.display = "none";
  extraInputs.style.display = "none";
  timeDiffWrapper.style.display = "none";
  hardCap.style.display = "none";
  simAllInputs.style.display = "none";
  modeInputDescription.style.display = "inline";
  modeInput.style.height = "1.8em";
  modeInput.style.width = "6rem";
  cap.style.display = "inline";
  if (mode.value !== "Single sim" && mode.value !== "Time diff." && mode.value !== "Chain") extraInputs.style.display = "flex";
  if (mode.value === "Time diff.") timeDiffWrapper.style.display = "grid";
  if (mode.value !== "All" && mode.value !== "Time diff.") singleInput.style.display = "grid";
  // if (mode.value === "Chain") hardCap.style.display = "block";
  if (mode.value === "All") {
    simAllInputs.style.display = "grid";
    modeInputDescription.style.display = "none";
    modeInput.style.height = "3rem";
    modeInput.style.width = "20rem";
  }
  modeInput.placeholder = data.modeInputPlaceholder[findIndex(data.modes, mode.value)];
  modeInputDescription.textContent = data.modeInputDescriptions[findIndex(data.modes, mode.value)];
}

event(theory, "change", theoryUpdate);

export function theoryUpdate(): void {
  while (strat.firstChild) strat.firstChild.remove();
  const defaultStrats: Array<string> = ["Best Overall", "Best Active", "Best Semi-Idle", "Best Idle"];
  for (let i = 0; i < 4; i++) {
    const option = <HTMLSelectElement>ce("option");
    option.value = defaultStrats[i];
    option.textContent = defaultStrats[i];
    strat.appendChild(option);
  }
  const index: number = findIndex(data.theories, theory.value);
  for (let i = 0; i < data.strats[index].length; i++) {
    const option = <HTMLSelectElement>ce("option");
    option.value = data.strats[index][i];
    option.textContent = data.strats[index][i];
    strat.appendChild(option);
  }
}

const simAllSettings: Array<boolean> = JSON.parse(localStorage.getItem("simAllSettings") ?? "[true, false]");
semi_idle.checked = simAllSettings[0];
hard_active.checked = simAllSettings[1];
