import { findIndex } from "./Utils/helperFunctions.js";
import { log10, theoryData, simResult, logToExp } from "./Utils/simHelpers.js";
import jsonData from "./data.json" assert { type: "json" };
import { qs, sleep } from "./Utils/helperFunctions.js";
import t4 from "./Theories/T4.js";
import t1 from "./Theories/T1.js";
import t2 from "./Theories/T2.js";
import t3 from "./Theories/T3.js";

const output = qs(".output");

export const global = {
  dt: 1.5,
  ddt: 1.0001,
  stratFilter: true,
  simulating: false,
  forcedPubTime: Infinity,
};

interface cacheInterface {
  lastStrat: string | null;
  simEndTimestamp: number;
}
const cache: cacheInterface = {
  lastStrat: null,
  simEndTimestamp: 0,
};

export interface inputData {
  theory: string;
  strat: string;
  sigma: string;
  rho: string;
  cap: string;
  mode: string;
  hardCap: boolean;
  modeInput: string;
}
interface parsedData {
  theory: string;
  strat: string;
  sigma: number;
  rho: number;
  cap: number;
  mode: string;
  hardCap: boolean;
  modeInput: string | Array<string> | number;
  recovery: null | { value: number; time: number; recoveryTime: boolean };
}

export async function simulate(simData: inputData): Promise<string | null | Array<simResult>> {
  if (global.simulating) {
    global.simulating = false;
    return "Sim stopped.";
  }
  if ((performance.now() - cache.simEndTimestamp) / 1000 < 1) return null;
  try {
    let pData: parsedData = parseData(simData);
    let res: Array<simResult>;
    global.simulating = true;
    if (pData.mode === "Single sim") res = [await singleSim(pData)];
    else {
      res = await chainSim(pData);
    }
    cache.simEndTimestamp = performance.now();
    return res;
  } catch (err) {
    return String(err);
  }
}

function parseData(data: inputData): parsedData {
  const parsedDataObj: parsedData = {
    theory: data.theory,
    strat: data.strat,
    mode: data.mode,
    hardCap: data.hardCap,
    modeInput: data.modeInput,
    sigma: 0,
    rho: 0,
    cap: Infinity,
    recovery: null,
  };

  if (data.mode !== "All" && data.mode !== "Time diff.") {
    //parsing sigma
    if (data.sigma.length > 0 && data.sigma.match(/^[0-9]+$/) !== null && parseInt(data.sigma) >= 0 && parseFloat(data.sigma) % 1 === 0) parsedDataObj.sigma = parseInt(data.sigma);
    else throw "Invalid sigma value. Sigma must be an integer that's > 0";

    //parsing currency
    if (data.rho.length > 0) parsedDataObj.rho = parseCurrencyValue(data.rho, parsedDataObj.theory, parsedDataObj.sigma);
    else throw "Input value cannot be empty.";

    //parsing cap if needed
    if (data.mode === "Chain" || data.mode === "Steps") {
      if (data.cap.length > 0) parsedDataObj.cap = parseCurrencyValue(data.cap, parsedDataObj.theory, parsedDataObj.sigma);
      else throw "Cap value cannot be empty.";
    }
  }
  if (data.mode !== "Single sim" && data.mode !== "Chain") {
    parsedDataObj.modeInput = parseModeInput(data.modeInput, data.mode);
  }

  return parsedDataObj;
}

async function singleSim(data: parsedData): Promise<simResult> {
  if (findIndex(["Best Overall", "Best Active", "Best Semi-Idle", "Best Idle"], data.strat) !== -1) return getBestStrat(data);
  const sendData: theoryData = {
    strat: data.strat,
    strats: jsonData.strats[getIndexFromTheory(data.theory)],
    sigma: data.sigma,
    rho: data.rho,
    recursionValue: null,
    recovery: data.recovery,
    cap: data.hardCap ? data.cap : null,
  };
  switch (data.theory) {
    case "T1":
      return await t1(sendData);
    case "T2":
      return await t2(sendData);
    case "T3":
      return await t3(sendData)
    case "T4":
      return await t4(sendData);
  }
  throw "Unknown error in singleSim() function. Please contact the author of the sim.";
}

async function chainSim(data: parsedData): Promise<Array<simResult>> {
  let lastPub: number = data.rho;
  let time: number = 0;
  const result: Array<simResult> = [];
  let stopOtp = logToExp(data.cap);
  let lastLog = 0;
  while (lastPub < data.cap) {
    if (!global.simulating) break;
    let st = performance.now();
    if (st - lastLog > 100) {
      lastLog = st;
      output.textContent = `Simulating ${logToExp(lastPub, 1)}/${stopOtp}`;
      await sleep();
    }
    let res = await singleSim({ ...data });
    result.push(res);
    lastPub = (<Array<any>>res[res.length - 1])[0];
    data.rho = lastPub;
    time += (<Array<any>>res[res.length - 1])[1];
  }
  return result;
}

async function getBestStrat(data: parsedData): Promise<simResult> {
  const strats: Array<string> = getStrats(data.theory, data.rho, data.strat);
  let bestSim: Array<number | string | Array<number>> = new Array(9).fill(0);
  for (let i = 0; i < strats.length; i++) {
    data.strat = strats[i];
    let sim = await singleSim(data);
    if (bestSim[7] < sim[7]) bestSim = sim;
  }
  return bestSim;
}

function getStrats(theory: string, rho: number, type: string): Array<string> {
  let conditions: Array<boolean> = [];
  switch (theory) {
    case "T1":
      conditions = [
        rho < 25, //T1
        type !== "Best Overall" && type !== "Best Active" && rho >= 25 && rho < 850, //T1C34
        type !== "Best Overall" && type !== "Best Active" && rho > 625, //T1C4
        type !== "Best Semi-Idle" && type !== "Best Idle" && (type === "Best Active" || rho < 250), //T1Ratio
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active", //T1SolarXLII
      ];
      break;
    case "T2":
      conditions = [
        (type !== "Best Semi-Idle" && type !== "Best Active" && type !== "Best Overall") || rho < 25, //T2
        type !== "Best Idle" && ((type !== "Best Active" && type !== "Best Overall") || rho >= 250), //T2mc
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 250, //T2ms
        type !== "Best Active" && type !== "Best Overall" && type !== "Best Idle" && rho < 250, //T2qs
      ];
      break;
    case "T3":
      conditions = [
        rho < 25, //t3
        type !== "Best Overall" && type !== "Best Active" && rho < 150, //T3C11C12C21
        type !== "Best Overall" && type !== "Best Active" && rho >= 175 && (rho < 300 || type !== "Best Semi-Idle"), //T3noC11C13C21C33
        type !== "Best Overall" && type !== "Best Active" && rho >= 100 && rho < 175, //T3noC13C32C33
        type !== "Best Overall" && type !== "Best Active" && rho >= 175 && rho < 300, //T3noC13C33
        type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle" && rho >= 200, //T3Snax
        type !== "Best Overall" && type !== "Best Idle" && type !== "Best Semi-Idle" && rho >= 275, //T3Snax2
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 150, //T3C11C12C21d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 350, //T3noC11C13C21C33d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 350, //T3noC11C13C33d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 175, //T3noC13C32C33d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 225, //T3noC13C33d
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" && rho >= 200 && rho < 375, //T3Play
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" && rho >= 250, //T3Play2
      ];
      break;
    case "T4":
      conditions = [
        rho < 30, //T4
        type !== "Best Overall" && type !== "Best Active" && rho < 600 && (cache.lastStrat === "T4C12" || cache.lastStrat === null || rho < 225), //T4C12
        type !== "Best Overall" && type !== "Best Active" && rho > 200, //T4C3
        type !== "Best Overall" && type !== "Best Active" && rho < 125, //T4C4
        type !== "Best Overall" && type !== "Best Active" && rho < 150, //T4C5
        type !== "Best Overall" && type !== "Best Active" && rho < 275, //T4C56
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 700 && (cache.lastStrat === "T4C12d" || cache.lastStrat === null || rho < 225), //T4C12d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 700 && rho > 175 && (cache.lastStrat !== "T4C3d66" || rho < 225), //T4C123d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 125, // T4C4d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 150, // T4C5d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 275, // T4C56d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 700 && (cache.lastStrat !== "T4C3d66" || rho < 300), //T4C3dC12rcv
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho > 225, //T4C3d66
      ];
      break;
    case "T5":
      conditions = [];
      break;
    case "T6":
      conditions = [];
      break;
    case "T7":
      conditions = [];
      break;
    case "T8":
      conditions = [];
      break;
    case "WSP":
      conditions = [];
      break;
    case "SL":
      conditions = [];
      break;
    case "EF":
      conditions = [];
      break;
    case "CSR2":
      conditions = [];
      break;
    case "PD":
      conditions = [];
      break;
    case "FI":
      conditions = [];
      break;
    case "BP":
      conditions = [];
      break;
  }
  let requirements: Array<boolean> = [];
  switch (theory) {
    case "T1":
      requirements = [
        true, //T1
        rho >= 25, //T1C34
        rho >= 50, //T1C4
        true, //T1Ratio
        true, //T1SolarXLII
      ];
      break;
    case "T2":
      requirements = [true, true, true, true];
      break;
    case "T3":
      requirements = [];
      break;
    case "T4":
      requirements = [
        true, //T4
        true, //T4C12
        true, //T4C3
        rho >= 25, //T4C4
        rho >= 50, //T4C5
        rho >= 50, //T4C56
        true, //T4C12d
        true, //T4C123d
        rho >= 25, //T4C4
        rho >= 50, //T4C5
        rho >= 50, //T4C56
        true, //T4C3dC12rcv
        true, //T4C3d66
      ];
      break;
    case "T5":
      requirements = [];
      break;
    case "T6":
      requirements = [];
      break;
    case "T7":
      requirements = [];
      break;
    case "T8":
      requirements = [];
      break;
    case "WSP":
      requirements = [];
      break;
    case "SL":
      requirements = [];
      break;
    case "EF":
      requirements = [];
      break;
    case "CSR2":
      requirements = [];
      break;
    case "PD":
      requirements = [];
      break;
    case "FI":
      requirements = [];
      break;
    case "BP":
      requirements = [];
      break;
  }
  if (conditions.length === 0) throw "No strats found";
  let res: Array<string> = [];
  for (let i = 0; i < conditions.length; i++) if ((conditions[i] || !global.stratFilter) && requirements[i]) res.push(jsonData.strats[getIndexFromTheory(theory)][i]);
  return res;
}
function getTauFactor(theory: string): number {
  switch (theory) {
    case "T1":
    case "T2":
    case "T3":
    case "T4":
    case "T5":
    case "T6":
    case "T7":
    case "T8":
      return 1;
    case "WSP":
    case "SL":
    case "CSR2":
    case "FI":
    case "PD":
      return 0.1;
    case "BP":
      return 0.15;
    case "EF":
      return 0.4;
  }
  throw `Invalid theory ${theory}. Please contact the author of the sim.`;
}
function parseCurrencyValue(value: string | Array<number | string>, theory: string, sigma: number, defaultConv: string = "r"): number {
  if (typeof value === "string") {
    const lastChar: string = value.charAt(value.length - 1);
    //checks if last character is not valid currency character. If not, throw error
    if (lastChar.match(/[r/t/m]/) !== null) {
      value = value.slice(0, -1);
      if (isValidCurrency(value)) value = [value, lastChar];
    } else if (lastChar.match(/[0-9]/)) {
      if (isValidCurrency(value)) value = [value, defaultConv];
    } else {
      throw `Invalid currency value ${value}. Currency value must be in formats <number>, <exxxx> or <xexxxx>.`;
    }
  }
  //Parses currency value if it is still a string.
  if (typeof value[0] === "string" && Array.isArray(value)) value[0] = parseValue(value[0]);
  //failsafe in case value is not parsed currectly.
  if (typeof value[0] !== "number") throw `Cannot parse value ${value[0]}. Please contact the author of the sim.`;
  //returns value if last character is r.
  if (value[1] === "r") return value[0];
  //returns value with correct tau factor if last character is t.
  if (value[1] === "t") return value[0] / getTauFactor(theory);
  //returns value converted to rho from current multiplier if last character is r.
  if (value[1] === "m") return reverseMulti(theory, value[0], sigma);
  throw `Cannot parse value ${value[0]} and ${value[1]}. Please contact the author of the sim.`;
}

function isValidCurrency(val: string): boolean {
  //if currency contains any other characters than 0-9 or e, throw error for invalid currency.
  if (val.match(/^[0-9/e]+$/) === null) throw `Invalid currency value ${val}. Currency value must be in formats <number>, <exxxx> or <xexxxx>.`;
  //if amount of e's in currency are more than 1, throw error for invalid currency.
  let es = 0;
  for (let i = 0; i < val.length; i++) if (val[i] === "e") es++;
  if (es > 1) throw `Invalid currency value ${val}. Currency value must be in formats <number>, <exxxx> or <xexxxx>.`;
  //if currency is valid, return true.
  return true;
}

function getIndexFromTheory(theory: string): number {
  return findIndex(jsonData.theories, theory);
}

function parseValue(val: string): number {
  if (/[e]/.test(val)) return log10(val);
  return parseFloat(val);
}

function reverseMulti(theory: string, value: number, sigma: number): number {
  let getR9Exp = () => (sigma < 65 ? 0 : sigma < 75 ? 1 : sigma < 85 ? 2 : 3);
  let divSigmaMulti = (exp: number, div: number) => (value - Math.log10((sigma / 20) ** getR9Exp()) + Math.log10(div)) * (1 / exp);
  let multSigmaMulti = (exp: number, mult: number) => (value - Math.log10((sigma / 20) ** getR9Exp()) - Math.log10(mult)) * (1 / exp);
  let sigmaMulti = (exp: number) => (value - Math.log10((sigma / 20) ** getR9Exp())) * (1 / exp);
  switch (theory) {
    case "T1":
      return divSigmaMulti(0.164, 3);
    case "T2":
      return divSigmaMulti(0.198, 100);
    case "T3":
      return multSigmaMulti(0.147, 3);
    case "T4":
      return divSigmaMulti(0.165, 4);
    case "T5":
      return sigmaMulti(0.159);
    case "T6":
      return divSigmaMulti(0.196, 50);
    case "T7":
      return sigmaMulti(0.152);
    case "T8":
      return sigmaMulti(0.15);
    case "WSP":
    case "SL":
      return value / 0.15;
    case "EF":
      return value * (1 / 0.387) * 2.5;
    case "CSR2":
      return (value + Math.log10(200)) * (1 / 2.203) * 10;
  }
  throw `Failed parsing multiplier. Please contact the author of the sim.`;
}

function parseModeInput(input: string | Array<string>, mode: string): Array<string> | number | string {
  //Parsing Step mode input
  if (mode === "Steps" && typeof input === "string") {
    if (isValidCurrency(input)) return parseValue(input);
  }
  //Parsing Time and Amount input
  if ((mode === "Time" || mode === "Amount") && typeof input === "string") {
    if (input.match(/[0-9]/) !== null) return parseFloat(input);
    throw mode + " input must be a number.";
  }
  //All and Time diff. mode has it's own parser functions
  if (mode === "Time diff." || mode === "All" || mode === "Single sim" || mode === "Chain") return input;
  throw `Couldnt parse mode ${mode}. Please contact the author of the sim.`;
}
