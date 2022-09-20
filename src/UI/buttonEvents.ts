import { qs, event } from "../Utils/helperFunctions.js";

//Buttons
const clear = qs(".clear");

//Other elements
const table = qs("table");

const output = qs(".output");

event(clear, "click", () => {
  while (table.children.length > 1 && table.lastChild) table.lastChild.remove();
  output.textContent = ""
  console.clear();
});
