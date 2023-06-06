import { log10, add, ZERO, subtract } from "./simHelpers.js";

interface variableData {
  lvl?: number;
  cost: costTypes;
  varBase?: number;
  value?: number | string;
  stepwisePowerSum?: { default?: boolean; length?: number; base?: number };
  firstFreeCost?: boolean;
}

export default class Variable {
  lvl: number;
  costData: costTypes;
  cost: number;
  value: number;
  stepwisePowerSum: { default?: boolean; length: number; base: number };
  varBase: number;
  firstFreeCost: number;

  constructor(data: variableData) {
    this.lvl = data.lvl ?? 0;
    this.costData = data.cost;
    this.cost = this.costData.getCost(this.lvl);
    this.value = typeof data.value === "number" || typeof data.value === "string" ? parseValue(String(data.value)) : 0;
    this.stepwisePowerSum =
      data.stepwisePowerSum?.default === true
        ? { base: 2, length: 10 }
        : typeof data.stepwisePowerSum?.base === "number" && typeof data.stepwisePowerSum?.length === "number"
        ? { base: data.stepwisePowerSum.base, length: data.stepwisePowerSum.length }
        : { base: 0, length: 0 };
    this.varBase = data.varBase ? data.varBase : 10;
    this.firstFreeCost = data.firstFreeCost === true ? 1 : 0;
    if (data.firstFreeCost) this.buy();
  }
  buy() {
    if (this.stepwisePowerSum.base !== 0) {
      this.value =
        this.value === ZERO
          ? Math.log10(this.stepwisePowerSum.base) * Math.floor(this.lvl / this.stepwisePowerSum.length)
          : add(this.value, Math.log10(this.stepwisePowerSum.base) * Math.floor(this.lvl / this.stepwisePowerSum.length));
    } else this.value = Math.log10(this.varBase) * (this.lvl + 1);
    this.lvl++;
    this.cost = this.costData.getCost(this.lvl - this.firstFreeCost);
  }
  reCalculate() {
    if (this.stepwisePowerSum.base !== 0) {
      let intPart = Math.floor(this.lvl / this.stepwisePowerSum.length);
      let modPart = this.lvl - intPart * this.stepwisePowerSum.length;
      let d = this.stepwisePowerSum.length / (this.stepwisePowerSum.base - 1);
      this.value = subtract(Math.log10(d + modPart) + Math.log10(this.stepwisePowerSum.base) * intPart, Math.log10(d));
    } else this.value = Math.log10(this.varBase) * this.lvl;
  }
}

function parseValue(val: string) {
  if (val === "Infinity") throw "Variable value reached Infinity";
  if (val === "0") return ZERO;
  if (/[e]/.test(val)) return log10(val);
  return Math.log10(Number(val));
}

type costTypes = ExponentialCost | CompositeCost | StepwiseCost;

export class CompositeCost {
  cutoff: number;
  cost1: costTypes;
  cost2: costTypes;
  constructor(cutoff: number, cost1: costTypes, cost2: costTypes) {
    this.cutoff = cutoff;
    this.cost1 = cost1;
    this.cost2 = cost2;
  }
  getCost(lvl: number): number {
    return lvl < this.cutoff ? this.cost1.getCost(lvl) : this.cost2.getCost(lvl - this.cutoff);
  }
}
export class ExponentialCost {
  cost: number;
  costInc: number;
  /**
   * ExponentialCost constructor
   * @param {number} base BaseCost of the variable
   * @param {number} costInc Cost Increase of the variable
   * @param {boolean} log2 States whether the cost increase is log2 or not - optional, default: false
   */
  constructor(base: number | string, costInc: number | string, log2: boolean | null = false) {
    this.cost = parseValue(String(base));
    this.costInc = parseValue(String(costInc));
    if (log2) this.costInc = Math.log10(2) * 10 ** this.costInc;
  }
  getCost(lvl: number) {
    return this.cost + this.costInc * lvl;
  }
}
export class StepwiseCost {
  stepLength: number;
  cost: costTypes;
  constructor(stepLength: number, cost: costTypes) {
    this.stepLength = stepLength;
    this.cost = cost;
  }
  getCost(lvl: number): number {
    return this.cost.getCost(Math.floor(lvl / this.stepLength));
  }
}
