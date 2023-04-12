import { log10, add, ZERO, subtract } from "./simHelpers.js";

interface variableData {
  lvl?: number;
  cost: number | string;
  costInc: number;
  stepwiseCost?: number;
  varBase?: number;
  value?: number | string;
  stepwisePowerSum?: { default?: boolean; length?: number; base?: number };
  firstFreeCost?: boolean;
}

export default class Variable {
  lvl: number;
  cost: number;
  costInc: number;
  stepwiseCost: number;
  value: number;
  stepwisePowerSum: { default?: boolean; length: number; base: number };
  varBase: number;

  constructor(data: variableData) {
    this.lvl = data.lvl ?? 0;
    this.cost = parseValue(String(data.cost));
    this.costInc = Math.log10(data.costInc);
    this.stepwiseCost = data.stepwiseCost ?? 1;
    this.value = typeof data.value === "number" || typeof data.value === "string" ? parseValue(String(data.value)) : 0;
    this.stepwisePowerSum =
      data.stepwisePowerSum?.default === true
        ? { base: 2, length: 10 }
        : typeof data.stepwisePowerSum?.base === "number" && typeof data.stepwisePowerSum?.length === "number"
        ? { base: data.stepwisePowerSum.base, length: data.stepwisePowerSum.length }
        : { base: 0, length: 0 };
    this.varBase = data.varBase ? data.varBase : 10;
    if (data.firstFreeCost) {
      this.buy();
      this.cost -= this.costInc;
    }
  }
  buy(): void {
    if ((this.lvl + 1) % this.stepwiseCost) this.cost += this.costInc;
    if (this.stepwisePowerSum.base !== 0) {
      this.value =
        this.value === ZERO
          ? Math.log10(this.stepwisePowerSum.base) * Math.floor(this.lvl / this.stepwisePowerSum.length)
          : add(this.value, Math.log10(this.stepwisePowerSum.base) * Math.floor(this.lvl / this.stepwisePowerSum.length));
    } else this.value = Math.log10(this.varBase) * (this.lvl + 1);
    this.lvl++;
  }
  reCalculate(): void {
    if (this.stepwisePowerSum.base !== 0) {
      let intPart = Math.floor(this.lvl / this.stepwisePowerSum.length);
      let modPart = this.lvl - intPart * this.stepwisePowerSum.length;
      let d = this.stepwisePowerSum.length / (this.stepwisePowerSum.base - 1);
      this.value = subtract(Math.log10(d + modPart) + Math.log10(this.stepwisePowerSum.base) * intPart, Math.log10(d));
    } else this.value = Math.log10(this.varBase) * this.lvl;
  }
}

function parseValue(val: string): number {
  if (val === "Infinity") throw "Variable value reached Infinity";
  if (val === "0") return ZERO;
  if (/[e]/.test(val)) return log10(val);
  return Math.log10(Number(val));
}
