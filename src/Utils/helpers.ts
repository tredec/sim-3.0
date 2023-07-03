import jsonData from "../Data/data.json" assert { type: "json" };
import { theory } from "../Sim/main";

export const qs = (name: string): HTMLElement => document.querySelector(name)!;
export const qsa = (name: string) => document.querySelectorAll(name)!;
export const ce = (type: string) => document.createElement(type)!;

export const event = (element: HTMLElement, eventType: string, callback: Function) => element.addEventListener(eventType, (e) => callback(e));

export function findIndex(arr: Array<string | number | boolean>, val: string | number | boolean) {
  for (let i = 0; i < arr.length; i++) if (val === arr[i]) return i;
  return -1;
}
export function sleep(time: number = 0) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function getIndexFromTheory(theory: string) {
  return theory in Object.keys(jsonData.theories);
}
export function getTheoryFromIndex(index: number): theory {
  return <theory>(<unknown>Object.keys(jsonData.theories)[index]);
}

export function log10(num: string) {
  const split = String(num).split("e");
  const result = Number(split[1]) + Math.log10(Math.max(1, Number(split[0])));
  return Number(result);
}

export function logToExp(num: number, dec: number = 3) {
  const wholePart: number = Math.floor(num);
  const fractionalPart: number = num - wholePart;
  const frac1: number = round(10 ** fractionalPart, dec);
  return (frac1 >= 10 ? frac1 / 10 : frac1) + "e" + (frac1 >= 10 ? wholePart + 1 : wholePart);
}
export function convertTime(secs: number): string {
  let mins = Math.floor((secs / 60) % 60);
  let hrs = Math.floor((secs / 3600) % 24);
  let days = Math.floor((secs / 86400) % 365);
  let years = Math.floor(secs / 31536000);
  let result = "";
  if (years > 0) {
    result += years < 1e6 ? years : logToExp(Math.log10(years));
    result += "y";
  }
  if (days > 0) result += days + "d";
  result += (hrs < 10 ? "0" : "") + hrs + "h";
  if (years === 0) result += (mins < 10 ? "0" : "") + mins + "m";
  return result;
}
export function formatNumber(value: number, precision: number = 6) {
  return value.toPrecision(precision).replace(/[+]/, "");
  // if (value >= 1e6) return logToExp(Math.log10(value), 3);
  // const l: number = Math.floor(Math.log10(Math.abs(value)));
  // let num = round(value, precision - l).toString();
  // while (num.split(".")[1]?.length < precision - l) num += "0";
  // return num;
}

export function round(number: number, decimals: number) {
  return Math.round(number * 10 ** decimals) / 10 ** decimals;
}

export function add(value1: number, value2: number) {
  const max = value1 > value2 ? value1 : value2;
  const min = value1 > value2 ? value2 : value1;
  const wholePart1 = Math.floor(max);
  const fractionalPart1 = 10 ** (max - wholePart1);
  const wholePart2 = Math.floor(min);
  const fractionalPart2 = 10 ** (min - wholePart2);
  return wholePart1 + Math.log10(fractionalPart1 + fractionalPart2 / 10 ** (wholePart1 - wholePart2));
}
export function subtract(value1: number, value2: number) {
  const max = value1 > value2 ? value1 : value2;
  const min = value1 > value2 ? value2 : value1;
  const wholePart1 = Math.floor(max);
  const fractionalPart1 = 10 ** (max - wholePart1);
  const wholePart2 = Math.floor(min);
  const fractionalPart2 = 10 ** (min - wholePart2);
  return wholePart1 + Math.log10(fractionalPart1 - fractionalPart2 / 10 ** (wholePart1 - wholePart2));
}

export function l10(val: number) {
  return Math.log10(val);
}
export function l2(val: number) {
  return Math.log2(val);
}
//written by propfeds
export function binarySearch(arr: Array<number>, target: number) {
  let l = 0;
  let r = arr.length - 1;
  while (l < r) {
    let m = Math.ceil((l + r) / 2);
    if (arr[m] <= target) l = m;
    else r = m - 1;
  }
  return l;
}

interface simResultInterface {
  sigma: number;
  pubRho: number;
  pubMulti: number;
  lastPub: number;
  recovery: { value: number; time: number; recoveryTime: boolean };
  pubT: number;
  strat: string;
  maxTauH: number;
  theory: theory;
}
export interface theoryData {
  sigma: number;
  rho: number;
  strat: string;
  recovery: null | { value: number; time: number; recoveryTime: boolean };
  cap: null | number;
  recursionValue: null | number | Array<number>;
}
export type simResult = [string, number, string, string, string, string, string, number, string, [number, number]];

export function createResult(data: simResultInterface, stratExtra: null | string): simResult {
  return [
    data.theory,
    data.sigma,
    logToExp(data.lastPub, 2),
    logToExp(data.pubRho, 2),
    logToExp((data.pubRho - data.lastPub) * jsonData.theories[data.theory].tauFactor, 2),
    formatNumber(data.pubMulti),
    data.strat + stratExtra,
    data.maxTauH === 0 ? 0 : Number(formatNumber(data.maxTauH * jsonData.theories[data.theory].tauFactor)),
    convertTime(Math.max(0, data.pubT - data.recovery.time)),
    [data.pubRho, data.recovery.recoveryTime ? data.recovery.time : Math.max(0, data.pubT - data.recovery.time)],
  ];
}
