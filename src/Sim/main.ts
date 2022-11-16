import { findIndex } from "../Utils/helperFunctions.js";
import { log10, theoryData, simResult, logToExp, convertTime, decimals } from "../Utils/simHelpers.js";
import jsonData from "./data.json" assert { type: "json" };
import { qs, sleep } from "../Utils/helperFunctions.js";
import t1 from "../Theories/T1-T8/T1.js";
import t2 from "../Theories/T1-T8/T2.js";
import t3 from "../Theories/T1-T8/T3.js";
import t4 from "../Theories/T1-T8/T4.js";
import t5 from "../Theories/T1-T8/T5.js";
import t6 from "../Theories/T1-T8/T6.js";
import t7 from "../Theories/T1-T8/T7.js";
import t8 from "../Theories/T1-T8/T8.js";
import { parseCurrencyValue, parseModeInput } from "./Components/parsers.js";
import { getIndexFromTheory, getTauFactor, getTheoryFromIndex } from "./Components/helpers.js";
import wsp from "../Theories/CTs/WSP.js";
import sl from "../Theories/CTs/SL.js";
import ef from "../Theories/CTs/EF.js";
import csr2 from "../Theories/CTs/CSR2.js";

const output = qs(".output");

export const global = {
  dt: 1.5,
  ddt: 1.0001,
  stratFilter: true,
  simulating: false,
  forcedPubTime: Infinity
};

interface cacheInterface {
  lastStrat: string | null;
  simEndTimestamp: number;
}
const cache: cacheInterface = {
  lastStrat: null,
  simEndTimestamp: 0
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
  hardCap?: boolean;
  modeInput?: string | Array<number> | number;
  recovery?: null | { value: number; time: number; recoveryTime: boolean };
}

export async function simulate(simData: inputData): Promise<string | null | Array<simResult>> {
  if (global.simulating) {
    global.simulating = false;
    return "Sim stopped.";
  }
  if ((performance.now() - cache.simEndTimestamp) / 1000 < 1) return null;
  try {
    let pData: parsedData = parseData(simData);
    let res: Array<simResult> = [];
    global.simulating = true;
    switch (pData.mode) {
      case "Single sim":
        res = [await singleSim(pData)];
        break;
      case "Chain":
        res = await chainSim(pData);
        break;
      case "Steps":
        res = await stepSim(pData);
        break;
      case "All":
        res = await simAll(pData);
        break;
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
    recovery: null
  };

  if (data.mode !== "All" && data.mode !== "Time diff.") {
    //parsing sigma
    if (data.sigma.length > 0 && data.sigma.match(/^[0-9]+$/) !== null && parseInt(data.sigma) >= 0 && parseFloat(data.sigma) % 1 === 0) parsedDataObj.sigma = parseInt(data.sigma);
    else throw "Invalid sigma value. Sigma must be an integer that's >= 0";

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
    recovery: data.recovery ?? { value: 0, time: 0, recoveryTime: false },
    cap: data.hardCap ? data.cap : null
  };
  switch (data.theory) {
    case "T1":
      return await t1(sendData);
    case "T2":
      return await t2(sendData);
    case "T3":
      return await t3(sendData);
    case "T4":
      return await t4(sendData);
    case "T5":
      return await t5(sendData);
    case "T6":
      return await t6(sendData);
    case "T7":
      return await t7(sendData);
    case "T8":
      return await t8(sendData);
    case "WSP":
      return await wsp(sendData);
    case "SL":
      return await sl(sendData);
    case "EF":
      return await ef(sendData);
    case "CSR2":
      return await csr2(sendData);
  }
  throw `Theory ${data.theory} is not defined in singleSim() function. Please contact the author of the sim.`;
}
async function chainSim(data: parsedData): Promise<Array<simResult>> {
  let lastPub: number = data.rho;
  let time: number = 0;
  const start = data.rho;
  const result: Array<simResult> = [];
  let stopOtp = logToExp(data.cap);
  let lastLog = 0;
  while (lastPub < data.cap) {
    let st = performance.now();
    if (st - lastLog > 250) {
      lastLog = st;
      output.textContent = `Simulating ${logToExp(lastPub, 0)}/${stopOtp}`;
      await sleep();
    }
    let res = await singleSim({ ...data });
    if (!global.simulating) break;
    if (typeof res[6] === "string") cache.lastStrat = res[6].split(" ")[0];
    result.push(res);
    lastPub = (<Array<any>>res[res.length - 1])[0];
    data.rho = lastPub;
    time += (<Array<any>>res[res.length - 1])[1];
  }
  cache.lastStrat = null;
  result.push(["", "", "", "", "ΔTau Total", "", "", `Average <span style="font-size:0.9rem; font-style:italics">&tau;</span>/h`, "Total Time"]);
  const dtau = (data.rho - start) * getTauFactor(data.theory);
  result.push(["", "", "", "", logToExp(dtau, 2), "", "", decimals(dtau / (time / 3600), 5), convertTime(time)]);
  return result;
}
async function stepSim(data: parsedData): Promise<Array<simResult>> {
  let time: number = 0;
  const start = data.rho;
  const result: Array<simResult> = [];
  let stopOtp = logToExp(data.cap);
  let lastLog = 0;
  while (data.rho < data.cap + 0.00001) {
    let st = performance.now();
    if (st - lastLog > 250) {
      lastLog = st;
      output.textContent = `Simulating ${logToExp(data.rho, 0)}/${stopOtp}`;
      await sleep();
    }
    let res = await singleSim({ ...data });
    if (!global.simulating) break;
    if (typeof res[6] === "string") cache.lastStrat = res[6].split(" ")[0];
    result.push(res);
    data.rho += <number>data.modeInput;
    time += (<Array<any>>res[res.length - 1])[1];
  }
  cache.lastStrat = null;
  return result;
}
async function simAll(data: parsedData): Promise<Array<simResult>> {
  const sigma = (<Array<number>>data.modeInput)[0];
  const values = (<Array<number>>data.modeInput).slice(1, (<Array<number>>data.modeInput).length);
  let res: Array<simResult> = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] === 0) continue;
    output.innerText = `Simulating ${getTheoryFromIndex(i)}/${getTheoryFromIndex(values.length - 1)}`;
    await sleep();
    if (!global.simulating) break;
    const modes = ["Best Semi-Idle", "Best Overall"];
    let temp = [];
    for (let j = 0; j < modes.length; j++) {
      let sendData: parsedData = {
        theory: getTheoryFromIndex(i),
        strat: modes[j],
        sigma,
        rho: values[i],
        cap: Infinity,
        mode: "Single Sim"
      };
      temp.push(await singleSim(sendData));
    }
    res.push(createSimAllOutput(temp));
  }
  res.push([sigma]);
  return res;
}
function createSimAllOutput(arr: Array<simResult>): simResult {
  return [arr[0][0], arr[0][2], arr[1][7], arr[0][7], decimals(<number>arr[1][7] / <number>arr[0][7], 4), arr[1][5], arr[0][5], arr[1][6], arr[0][6], arr[1][8], arr[0][8], arr[1][4], arr[0][4]];
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
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" //T1SolarXLII
      ];
      break;
    case "T2":
      conditions = [
        (type !== "Best Semi-Idle" && type !== "Best Active" && type !== "Best Overall") || rho < 25, //T2
        type !== "Best Idle" && ((type !== "Best Active" && type !== "Best Overall") || rho >= 250), //T2mc
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 250, //T2ms
        type !== "Best Active" && type !== "Best Overall" && type !== "Best Idle" && rho < 250 //T2qs
      ];
      break;
    case "T3":
      conditions = [
        rho < 25, //t3
        type !== "Best Overall" && type !== "Best Active" && rho < 150, //T3C11C12C21
        type !== "Best Overall" && type !== "Best Active" && type !== "Best Semi-Idle" && rho >= 175 && rho < 300, //T3noC11C13C21C33
        type !== "Best Overall" && type !== "Best Active" && rho >= 100 && rho < 175, //T3noC13C32C33
        type !== "Best Overall" && type !== "Best Active" && type !== "Best Semi-Idle" && rho >= 175 && rho < 300, //T3noC13C33
        type !== "Best Overall" && type !== "Best Active" && rho >= 260 && (rho < 500 || type !== "Best Semi-Idle"), //T3noP1C13C33
        type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle" && rho >= 150, //T3Snax
        type !== "Best Overall" && type !== "Best Idle" && type !== "Best Semi-Idle" && rho >= 275, //T3Snax2
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 150, //T3C11C12C21d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 350, //T3noC11C13C21C33d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 350, //T3noC11C13C33d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 175, //T3noC13C32C33d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 225, //T3noC13C33d
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" && rho >= 200 && rho < 375, //T3Play
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" && rho >= 250 //T3Play2
      ];
      break;
    case "T4":
      conditions = [
        rho < 30, //T4
        type !== "Best Overall" && type !== "Best Active" && rho < 600 && cache.lastStrat !== "T4C3", //T4C12
        type !== "Best Overall" && type !== "Best Active" && rho > 200, //T4C3
        type !== "Best Overall" && type !== "Best Active" && rho < 125, //T4C4
        type !== "Best Overall" && type !== "Best Active" && rho < 150, //T4C5
        type !== "Best Overall" && type !== "Best Active" && rho < 275, //T4C56
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 700 && cache.lastStrat !== "T4C3d66" && cache.lastStrat !== "T4C123d", //T4C12d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 700 && rho > 175 && (cache.lastStrat !== "T4C3d66" || rho < 225), //T4C123d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 75 && rho < 200, //T4C456dC12rcvMS
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 175 && rho < 300, //T4C356dC12rcv
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 275, // T4C56d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho > 240 //T4C3d66
      ];
      break;
    case "T5":
      conditions = [
        rho < 25 || (type !== "Best Overall" && type !== "Best Active" && type !== "Best Semi-Idle"), //T5
        type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle", //T5Idle
        type !== "Best Idle" && type !== "Best Semi-Idle" //T5AI2
      ];
      break;
    case "T6":
      conditions = [
        rho < 25, //T6
        type !== "Best Overall" && type !== "Best Active" && rho < 25, //T6C3
        type !== "Best Overall" && type !== "Best Active" && rho >= 25 && rho < 100, //T6C4
        type !== "Best Overall" && type !== "Best Active" && rho > 100 && rho < 1100 && cache.lastStrat !== "T6noC1234", //T6noC34
        type !== "Best Overall" && type !== "Best Active" && rho > 100 && rho < 750 && cache.lastStrat !== "T6noC34" && cache.lastStrat !== "T6noC1234", //T6noC345
        type !== "Best Overall" && type !== "Best Active" && rho > 800, //T6noC1234
        type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle" && rho > 400, //T6snax
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 25, //T6C3d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 25 && rho < 100, //T6C4d
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Overall" && rho > 100 && rho < 1100 && cache.lastStrat !== "T6noC1234", //T6noC34d
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Overall" && rho > 100 && rho < 750 && cache.lastStrat !== "T6noC34" && cache.lastStrat !== "T6noC1234", //T6noC345d
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Overall" && rho > 800, //T6noC1234d
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" && rho >= 100 //T6AI
      ];
      break;
    case "T7":
      conditions = [
        false, //T7
        type !== "Best Overall" && type !== "Best Active" && (rho < 25 || (rho >= 75 && rho < 100)), //T7C12
        type !== "Best Overall" && type !== "Best Active" && rho >= 25 && rho < 75, //T7C3
        type !== "Best Overall" && type !== "Best Active" && rho < 550 && rho >= 100, //T7noC12
        type !== "Best Overall" && type !== "Best Active" && rho < 625 && rho > 500, //T7noC123
        type !== "Best Overall" && type !== "Best Active" && rho > 525, //T7noC1234
        type !== "Best Semi-Idle" && type !== "Best Idle" && (rho < 25 || (rho >= 75 && rho < 150)), //T7C12d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 25 && rho < 75, //T7C3
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 100 //T7PlaySpqcey
      ];
      break;
    case "T8":
      conditions = [
        type !== "Best Overall" && type !== "Best Active" && (type !== "Best Semi-Idle" || rho < 100), //T8
        type !== "Best Overall" && type !== "Best Active" && rho < 25, //T8noC3
        type !== "Best Overall" && type !== "Best Active" && rho >= 160 && rho < 220, //T8noC5
        type !== "Best Overall" && type !== "Best Active" && rho >= 100 && rho < 160, //T8noC35
        type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle", //T8snax
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 60, //T8noC3d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 160 && rho < 220, //T8noC5d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 100 && rho < 160, //T8noC35d
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 40 && rho < 100, //T8d
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Overall" && rho >= 220, //T8Play (It is best strat in e40-e60 range, but i dont want it to appear at that low rho. d strats are almost as good)
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" //T8PlaySolarswap
      ];

      break;
    case "WSP":
      conditions = [
        type !== "Best Overall" && type !== "Best Active" && rho < 525, //WSP
        type !== "Best Overall" && type !== "Best Active" && rho > 475, //WSPstopC1
        type !== "Best Semi-Idle" && type !== "Best Idle" //WSPdstopC1
      ];
      break;
    case "SL":
      conditions = [
        rho < 25 || type === "Best Idle", //Sl
        type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle" && rho >= 300, //SLStopA
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 300, //SLStopAd
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Overall" && rho < 300, //SLMS
        type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" && rho < 300 //SLMSd
      ];
      break;
    case "EF":
      conditions = [
        rho < 10 || type === "Best Idle", //EF
        type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle", //EFsnax
        type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 10, //EFd
        type !== "Best Semi-Idle" && type !== "Best Idle" //EFAI
      ];
      break;
    case "CSR2":
      conditions = [
        rho < 10 || type === "Best Idle" || type === "Best Semi-Idle", //CSR2
        type === "Best Active" && rho < 500, //CSR2d
        (type === "Best Overall" || (type === "Best Active" && rho >= 500)) && rho > 10 //CSR2XL
      ];
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
        true //T1SolarXLII
      ];
      break;
    case "T2":
      requirements = [
        true, //T2
        true, //T2mc
        true, //T2ms,
        true //T2qs
      ];
      break;
    case "T3":
      requirements = [
        true, //t3
        true, //T3C11C12C21
        true, //T3noC11C13C21C33
        true, //T3noC13C32C33
        true, //T3noC13C33
        true, //T3noP1C13C33
        true, //T3Snax
        true, //T3Snax2
        true, //T3C11C12C21d
        true, //T3noC11C13C21C33d
        true, //T3noC11C13C33d
        true, //T3noC13C32C33d
        true, //T3noC13C33d
        true, //T3Play
        true //T3Play2
      ];
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
        rho >= 25, //T4C456dC12rcvMS
        rho >= 75, //T4C356dC12rcv
        rho >= 50, //T4C56d
        true //T4C3d66
      ];
      break;
    case "T5":
      requirements = [
        true, //T5
        true, //T5Idle
        true //T5AI2
      ];
      break;
    case "T6":
      requirements = [
        true, //T6
        true, //T6C3
        true, //T6C4
        true, //T6noC34
        true, //T6noC345
        rho >= 125, //T6noC1234
        true, //T6snax
        true, //T6C3d
        true, //T6C4d
        true, //T6noC34d
        true, //T6noC345d
        rho >= 125, //T6noC1234d
        true //T6AI
      ];
      break;

    case "T7":
      requirements = [
        true, //T7
        true, //T7C12
        rho >= 25, //T7C3
        rho >= 25, //T7noC12
        rho >= 75, //T7noC123
        rho >= 75, //T7noc1234
        true, //T7C12d
        rho >= 25, //T7C3d
        rho >= 100 //T7PlaySpqcey
      ];
      break;
    case "T8":
      requirements = [
        true, //T8
        true, //T8noC3
        true, //T8noC5
        true, //T8noC35
        true, //T8snax
        true, //T8noC3d
        true, //T8noC5d
        true, //T8noC35d
        true, //T8d
        true, //T8Play
        true //T8PlaySolarswap
      ];
      break;
    case "WSP":
      requirements = [
        true, //WSP
        true, //WSPstopC1
        true //WSPdstopC1
      ];
      break;
    case "SL":
      requirements = [
        true, //Sl
        true, //SLstopA
        true, //SlstopAd
        true, //SLMS
        true //SLMSd
      ];
      break;
    case "EF":
      requirements = [
        true, //EF
        true, //EFsnax
        true, //EFd
        true //EFAI
      ];
      break;
    case "CSR2":
      requirements = [
        true, //CSR2
        true, //CSR2d
        true //CSR2XL
      ];
      break;
  }
  if (conditions.length === 0) throw "No strats found";
  let res: Array<string> = [];
  for (let i = 0; i < conditions.length; i++) if ((conditions[i] || !global.stratFilter) && requirements[i]) res.push(jsonData.strats[getIndexFromTheory(theory)][i]);
  return res;
}
