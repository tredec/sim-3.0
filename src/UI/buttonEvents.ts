import { qs, event, ce } from "../Utils/helperFunctions.js";

//Buttons
const clear = qs(".clear");

//Other elements
const table = qs("table");
const tbody = qs("tbody");

const output = qs(".output");

event(clear, "click", () => {
  while (tbody.firstChild) tbody.firstChild.remove();
  output.textContent = "";
  console.clear();
});
