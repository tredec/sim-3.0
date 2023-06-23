import { simResult, event, qs, sleep } from "../../Utils/helpers.js";
import { global, inputData, simulate } from "../main.js";
import { parseSimParams } from "./parsers.js";
import Terminal from "./terminal.js";

if (localStorage.getItem("dev") === "true") {
  const terminal = new Terminal();

  let customVal = localStorage.getItem("customVal");
  if (customVal !== null) setValue([customVal]);

  //event for sending commands
  event(terminal.input, "keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      const input = terminal.parseInput();
      executeCommand(input);
    }
    if (e.key === "ArrowUp") terminal.getHistory(-1);
    if (e.key === "ArrowDown") terminal.getHistory(1);
  });

  //events for moving the terminal
  let offset = { x: 0, y: 0 };
  let drag: HTMLElement | null = null;
  event(terminal.terminal_element, "mousedown", (e: any) => {
    if (!(<HTMLElement>e.target).classList.contains("terminal")) return;
    drag = terminal.terminal_element;
    offset.x = e.layerX;
    offset.y = e.layerY;
  });
  event(terminal.terminal_element, "mouseup", () => {
    drag = null;
  });
  event(document.documentElement, "mousemove", (e: MouseEvent) => {
    if (drag === null) return;
    drag.style.left = e.clientX - offset.x + "px";
    drag.style.top = e.clientY - offset.y + "px";
    localStorage.setItem("terminalPos", JSON.stringify({ top: e.clientY - offset.y + "px", left: e.clientX - offset.x + "px" }));
  });

  async function executeCommand(string: string) {
    string = string.slice(
      Math.max(
        0,
        string.split("").findIndex((i) => i !== " ")
      ),
      string.length
    );
    const spaceIndex = string.split("").findIndex((i) => i === " ");
    const [fn, params] = [
      spaceIndex === -1 ? string : string.slice(0, spaceIndex),
      spaceIndex === -1
        ? [""]
        : string
            .slice(spaceIndex + 1, string.length)
            .replace(/ /g, "")
            .split(",")
    ];

    try {
      switch (fn) {
        case "c":
        case "clear":
          clear(params[0]);
          break;
        case "r":
        case "rs":
        case "resize":
          resize(params);
        case "sim":
          sim(params);
          break;
        case "v":
        case "val":
        case "value":
          setValue(params);
          break;
        case "":
          break;
        default:
          terminal.writeLine(`Function name "${fn}" does not exist.`);
      }
    } catch (e) {
      terminal.writeLine(`<r>Error:</r> ${e}`);
    }
  }

  function clear(param: string) {
    const all = ["a", "all"].findIndex((i) => i === param) > -1;
    terminal.clearTerminal();
    if (all) {
      console.clear();
    }
  }
  function resize(params: Array<string>) {
    if (params[0] === "" && params.length === 1) throw "At least one parameter is required.";

    const x = parseFloat(params[0]);
    const y = parseFloat(params[1]);

    const terminalSize = params[0] === "d" ? { width: "700px", height: "400px" } : JSON.parse(localStorage.getItem("terminalSize") ?? `{"width": "700px", "height":"400px"}`);

    if (!isNaN(x)) {
      terminalSize.width = `${x < 5 ? terminal.terminal_element.clientWidth * x : x}px`;
    }
    if (!isNaN(y)) {
      terminalSize.height = `${y < 5 ? terminal.terminal_element.clientHeight * y : y}px`;
    }
    terminal.terminal_element.style.width = terminalSize.width;
    terminal.terminal_element.style.height = terminalSize.height;
    localStorage.setItem("terminalSize", JSON.stringify(terminalSize));
    terminal.writeLine(`Resized terminal to <g>${terminalSize.width}</g> | <g>${terminalSize.height}</g>.`);
  }

  function setValue(params: Array<string>) {
    let str = params.join(",");
    if (str === "g") terminal.writeLine(`Value of global.customVal is <g>${JSON.stringify(global.customVal)}</g>.`);
    else {
      global.customVal = JSON.parse(str);
      localStorage.setItem("customVal", str);
      terminal.writeLine(`Sucsessfully set global.customVal to <g>${str}</g>.`);
    }
  }

  async function sim(params: Array<string>) {
    let timeA = performance.now();
    const data = parseSimParams(params);
    await sleep();
    let res = await simulate(data);
    global.simulating = false;
    if (typeof res === "string" || res === null) {
      terminal.writeLine(JSON.stringify(res));
      console.error(res);
    } else {
      printSimResults(res, data);
      terminal.writeLine(`Sim finished sucsessfully in <g>${((performance.now() - timeA) / 1000).toFixed(3)}s</g>.`);
    }
  }

  function printSimResults(arr: Array<simResult>, data: inputData) {
    if (data.mode === "Single sim") {
      terminal.writeLine(`${arr[0][1]} | ${arr[0][2]} | ${arr[0][3]} | ${arr[0][5]} | ${arr[0][6]} | ${arr[0][7]} | ${arr[0][8]}`);
    } else if (data.mode === "Chain") {
      const l = arr.length - 1;
      terminal.writeLine(`${data.strat} | ${data.sigma} | ${data.rho} --> ${arr[l - 2][3]} | ${arr[l][4]} | ${arr[l][7]} | ${arr[l][8]}`);
    } else if (data.mode === "Steps") {
      let str = "";
      for (let i = 0; i < arr.length; i++) str += arr[i][7] + "\n";
      navigator.clipboard.writeText(str);
      terminal.writeLine(`Copied ${arr.length} tau/h values to clipboard.`);
    }

    updateTable(arr);
  }

  function updateTable(arr: Array<simResult>): void {
    let table = qs(".simTable");
    let thead = qs(".simTable > thead");
    let tbody = qs(".simTable > tbody");
    while (tbody.firstChild) tbody.firstChild.remove();

    for (let i = 0; i < arr.length; i++) {
      const row = <HTMLTableRowElement>document.createElement("tr");
      for (let j = 0; j < thead.children[0].children.length; j++) {
        const cell = document.createElement("td");
        cell.innerHTML = String(arr[i][j]);
        row.appendChild(cell);
      }
      tbody.appendChild(row);
    }
  }
}
