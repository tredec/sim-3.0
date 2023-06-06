import { log10, add, ZERO, subtract } from "./simHelpers.js";
export default class Variable {
    constructor(data) {
        var _a, _b, _c, _d;
        this.lvl = (_a = data.lvl) !== null && _a !== void 0 ? _a : 0;
        this.costData = data.cost;
        this.cost = this.costData.getCost(this.lvl);
        this.value = typeof data.value === "number" || typeof data.value === "string" ? parseValue(String(data.value)) : 0;
        this.stepwisePowerSum =
            ((_b = data.stepwisePowerSum) === null || _b === void 0 ? void 0 : _b.default) === true
                ? { base: 2, length: 10 }
                : typeof ((_c = data.stepwisePowerSum) === null || _c === void 0 ? void 0 : _c.base) === "number" && typeof ((_d = data.stepwisePowerSum) === null || _d === void 0 ? void 0 : _d.length) === "number"
                    ? { base: data.stepwisePowerSum.base, length: data.stepwisePowerSum.length }
                    : { base: 0, length: 0 };
        this.varBase = data.varBase ? data.varBase : 10;
        this.firstFreeCost = data.firstFreeCost === true ? 1 : 0;
        if (data.firstFreeCost)
            this.buy();
    }
    buy() {
        if (this.stepwisePowerSum.base !== 0) {
            this.value =
                this.value === ZERO
                    ? Math.log10(this.stepwisePowerSum.base) * Math.floor(this.lvl / this.stepwisePowerSum.length)
                    : add(this.value, Math.log10(this.stepwisePowerSum.base) * Math.floor(this.lvl / this.stepwisePowerSum.length));
        }
        else
            this.value = Math.log10(this.varBase) * (this.lvl + 1);
        this.lvl++;
        this.cost = this.costData.getCost(this.lvl - this.firstFreeCost);
    }
    reCalculate() {
        if (this.stepwisePowerSum.base !== 0) {
            let intPart = Math.floor(this.lvl / this.stepwisePowerSum.length);
            let modPart = this.lvl - intPart * this.stepwisePowerSum.length;
            let d = this.stepwisePowerSum.length / (this.stepwisePowerSum.base - 1);
            this.value = subtract(Math.log10(d + modPart) + Math.log10(this.stepwisePowerSum.base) * intPart, Math.log10(d));
        }
        else
            this.value = Math.log10(this.varBase) * this.lvl;
    }
}
function parseValue(val) {
    if (val === "Infinity")
        throw "Variable value reached Infinity";
    if (val === "0")
        return ZERO;
    if (/[e]/.test(val))
        return log10(val);
    return Math.log10(Number(val));
}
export class CompositeCost {
    constructor(cutoff, cost1, cost2) {
        this.cutoff = cutoff;
        this.cost1 = cost1;
        this.cost2 = cost2;
    }
    getCost(lvl) {
        return lvl < this.cutoff ? this.cost1.getCost(lvl) : this.cost2.getCost(lvl - this.cutoff);
    }
}
export class ExponentialCost {
    /**
     * ExponentialCost constructor
     * @param {number} base BaseCost of the variable
     * @param {number} costInc Cost Increase of the variable
     * @param {boolean} log2 States whether the cost increase is log2 or not - optional, default: false
     */
    constructor(base, costInc, log2 = false) {
        this.cost = parseValue(String(base));
        this.costInc = parseValue(String(costInc));
        if (log2)
            this.costInc = Math.log10(2) * Math.pow(10, this.costInc);
    }
    getCost(lvl) {
        return this.cost + this.costInc * lvl;
    }
}
export class StepwiseCost {
    constructor(stepLength, cost) {
        this.stepLength = stepLength;
        this.cost = cost;
    }
    getCost(lvl) {
        return this.cost.getCost(Math.floor(lvl / this.stepLength));
    }
}
