import { log10, add, subtract } from "./helpers.js";

interface variableData {
  level?: number;
  cost: costTypes;
  varBase?: number;
  value?: number | string;
  stepwisePowerSum?: { default?: boolean; length?: number; base?: number };
  firstFreeCost?: boolean;
}

export default class Variable {
  level: number;
  costData: costTypes;
  cost: number;
  value: number;
  stepwisePowerSum: { default?: boolean; length: number; base: number };
  varBase: number;
  firstFreeCost: number;
  isZero: boolean;

  constructor(data: variableData) {
    this.level = data.level ?? 0;
    this.costData = data.cost;
    this.cost = this.costData.getCost(this.level);
    this.value = typeof data.value === "number" || typeof data.value === "string" ? parseValue(String(data.value)) : 0;
    this.isZero = false;
    if (this.value === -Infinity) {
      this.value = 0;
      this.isZero = true;
    }
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
      this.value = this.isZero
        ? Math.log10(this.stepwisePowerSum.base) * Math.floor(this.level / this.stepwisePowerSum.length)
        : add(this.value, Math.log10(this.stepwisePowerSum.base) * Math.floor(this.level / this.stepwisePowerSum.length));
      this.isZero = false;
    } else this.value = Math.log10(this.varBase) * (this.level + 1);
    this.level++;
    this.cost = this.costData.getCost(this.level - this.firstFreeCost);
  }
  reCalculate() {
    if (this.stepwisePowerSum.base !== 0) {
      let intPart = Math.floor(this.level / this.stepwisePowerSum.length);
      let modPart = this.level - intPart * this.stepwisePowerSum.length;
      let d = this.stepwisePowerSum.length / (this.stepwisePowerSum.base - 1);
      this.value = subtract(Math.log10(d + modPart) + Math.log10(this.stepwisePowerSum.base) * intPart, Math.log10(d));
    } else this.value = Math.log10(this.varBase) * this.level;
  }
}

function parseValue(val: string) {
  if (val === "Infinity") throw "Variable value reached Infinity";
  if (val === "0") return -Infinity;
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
  getCost(level: number): number {
    return level < this.cutoff ? this.cost1.getCost(level) : this.cost2.getCost(level - this.cutoff);
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
  getCost(level: number) {
    return this.cost + this.costInc * level;
  }
}
export class StepwiseCost {
  stepLength: number;
  cost: costTypes;
  constructor(stepLength: number, cost: costTypes) {
    this.stepLength = stepLength;
    this.cost = cost;
  }
  getCost(level: number): number {
    return this.cost.getCost(Math.floor(level / this.stepLength));
  }
}
