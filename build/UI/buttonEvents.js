import { qs, event } from "../Utils/helperFunctions.js";
//Buttons
const clear = qs(".clear");
//Other elements
let tbody;
const output = qs(".output");
event(clear, "click", () => {
    tbody = qs("tbody");
    while (tbody.firstChild)
        tbody.firstChild.remove();
    output.textContent = "";
    console.clear();
});
