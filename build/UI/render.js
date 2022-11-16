import { qs, qsa, event, ce, findIndex } from "../Utils/helperFunctions.js";
import data from "../Sim/data.json" assert { type: "json" };
//Inputs
const theory = qs(".theory");
const strat = qs(".strat");
const sigma = qs(".sigma");
const input = qs(".input");
const cap = qs(".cap");
const mode = qs(".mode");
const modeInput = qs("textarea");
const hardCap = qs(".hardCap");
//Other containers/elements
const extraInputs = qs(".extraInputs");
const timeDiffWrapper = qs(".timeDiffWrapper");
const singleInput = qsa(".controls")[0];
const simAllInputs = qs(".simAllInputs");
const modeInputDescription = qs(".extraInputDescription");
//Renders theories, strats and modes options on page load
window.onload = () => {
    for (let i = 0; i < data.theories.length; i++) {
        const option = ce("option");
        option.value = data.theories[i];
        option.textContent = data.theories[i];
        theory.appendChild(option);
    }
    for (let i = 0; i < data.strats[0].length; i++) {
        const option = ce("option");
        option.value = data.strats[0][i];
        option.textContent = data.strats[0][i];
        strat.appendChild(option);
    }
    for (let i = 0; i < data.modes.length; i++) {
        const option = ce("option");
        option.value = data.modes[i];
        option.textContent = data.modes[i];
        mode.appendChild(option);
    }
    modeUpdate();
};
event(mode, "input", modeUpdate);
export function modeUpdate() {
    singleInput.style.display = "none";
    extraInputs.style.display = "none";
    timeDiffWrapper.style.display = "none";
    hardCap.style.display = "none";
    simAllInputs.style.display = "none";
    modeInputDescription.style.display = "inline";
    modeInput.style.height = "1.8em";
    modeInput.style.width = "6rem";
    cap.style.display = "inline";
    if (mode.value !== "Single sim" && mode.value !== "Time diff." && mode.value !== "Chain")
        extraInputs.style.display = "flex";
    if (mode.value === "Time diff.")
        timeDiffWrapper.style.display = "grid";
    if (mode.value !== "All" && mode.value !== "Time diff.")
        singleInput.style.display = "grid";
    if (mode.value === "Chain")
        hardCap.style.display = "block";
    if (mode.value === "All") {
        simAllInputs.style.display = "-ms-inline-grid";
        modeInputDescription.style.display = "none";
        modeInput.style.height = "3rem";
        modeInput.style.width = "20rem";
    }
    modeInput.placeholder = data.modeInputPlaceholder[findIndex(data.modes, mode.value)];
    modeInputDescription.textContent = data.modeInputDescriptions[findIndex(data.modes, mode.value)];
}
event(theory, "change", theoryUpdate);
export function theoryUpdate() {
    while (strat.firstChild)
        strat.firstChild.remove();
    const defaultStrats = ["Best Overall", "Best Active", "Best Semi-Idle", "Best Idle"];
    for (let i = 0; i < 4; i++) {
        const option = ce("option");
        option.value = defaultStrats[i];
        option.textContent = defaultStrats[i];
        strat.appendChild(option);
    }
    const index = findIndex(data.theories, theory.value);
    for (let i = 0; i < data.strats[index].length; i++) {
        const option = ce("option");
        option.value = data.strats[index][i];
        option.textContent = data.strats[index][i];
        strat.appendChild(option);
    }
}
