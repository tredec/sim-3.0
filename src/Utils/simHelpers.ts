export function log10(num: string): number {
  const split: Array<string> = String(num).split("e");
  const result: number = Number(split[1]) + Math.log10(Math.max(1, Number(split[0])));
  return Number(result);
}

export function logToExp(num: number, dec: number = 3): string {
  const wholePart: number = Math.floor(num);
  const fractionalPart: number = num - wholePart;
  const frac1: number = round(10 ** fractionalPart, dec);
  return (frac1 >= 10 ? frac1 / 10 : frac1) + "e" + (frac1 >= 10 ? wholePart + 1 : wholePart);
}
export function convertTime(secs: number): string {
  return `${Math.floor(secs / 86400)}d${Math.floor((secs / 3600) % 24)}h${Math.floor((secs / 60) % 60)}m`;
}
export function decimals(val: number, def: number = 5): number | string {
  if (val >= 1e6) return logToExp(Math.log10(val), 3);
  const l: number = Math.floor(Math.log10(Math.abs(val)));
  return round(val, def - l);
}

export function round(number: number, decimals: number): number {
  return Math.round(number * 10 ** decimals) / 10 ** decimals;
}

export function add(value1: number, value2: number): number {
  const max: number = value1 > value2 ? value1 : value2;
  const min: number = value1 > value2 ? value2 : value1;
  const wholePart1: number = Math.floor(max);
  const fractionalPart1: number = 10 ** (max - wholePart1);
  const wholePart2: number = Math.floor(min);
  const fractionalPart2: number = 10 ** (min - wholePart2);
  return wholePart1 + Math.log10(fractionalPart1 + fractionalPart2 / 10 ** (wholePart1 - wholePart2));
}
export function subtract(value1: number, value2: number): number {
  const max: number = value1 > value2 ? value1 : value2;
  const min: number = value1 > value2 ? value2 : value1;
  const wholePart1: number = Math.floor(max);
  const fractionalPart1: number = 10 ** (max - wholePart1);
  const wholePart2: number = Math.floor(min);
  const fractionalPart2: number = 10 ** (min - wholePart2);
  return wholePart1 + Math.log10(fractionalPart1 - fractionalPart2 / 10 ** (wholePart1 - wholePart2));
}

export function arr(i: number, b: number | boolean | Array<any>): Array<any> {
  let arr: Array<any> = new Array(i).fill(b);
  let res: Array<any> = [];
  if (!Array.isArray(b)) return arr;
  for (let i = 0; i < arr.length; i++) {
    if (arr[0][0].constructor === Array) {
      const d2a: boolean = arr[0][0][0].constructor === Array;
      if (d2a) {
        res.push(...arr[i]);
      } else res.push(arr[i]);
    } else res.push(arr[i]);
  }
  return res;
}

export function l10(val: number): number {
  return Math.log10(val);
}

export const ZERO: number = Math.random() + 0.000000001;

export interface variableInterface {
  lvl: number;
  cost: number;
  costInc: number;
  value: number;
  stepwisePowerSum: { default?: boolean; length: number; base: number };
  varBase: number;
  buy: Function;
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
  theory: string;
}
export interface theoryData {
  strats: Array<string>;
  sigma: number;
  rho: number;
  strat: string;
  recovery: null | { value: number; time: number; recoveryTime: boolean };
  cap: null | number;
  recursionValue: null | number;
}
export type simResult = Array<number | string | Array<number>>;
export function createResult(data: simResultInterface, stratExtra: null | string) {
  return [
    "<b>" + data.theory + "</b",
    data.sigma,
    logToExp(data.lastPub, 2),
    logToExp(data.pubRho, 2),
    logToExp(data.pubRho - data.lastPub, 2),
    decimals(data.pubMulti),
    data.strat + stratExtra,
    decimals(data.maxTauH),
    convertTime(Math.max(0, data.pubT - data.recovery.time)),
    [data.pubRho, data.recovery.recoveryTime ? data.recovery.time : Math.max(0, data.pubT - data.recovery.time)]
  ];
}
