import { log10, add, subtract } from "./helpers.js";
export default class Variable {
    constructor(data) {
        var _a, _b, _c, _d;
        this.level = (_a = data.level) !== null && _a !== void 0 ? _a : 0;
        this.costData = data.cost;
        this.cost = this.costData.getCost(this.level);
        this.value = typeof data.value === "number" || typeof data.value === "string" ? parseValue(String(data.value)) : 0;
        this.isZero = false;
        if (this.value === -Infinity) {
            this.value = 0;
            this.isZero = true;
        }
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
            this.value = this.isZero
                ? Math.log10(this.stepwisePowerSum.base) * Math.floor(this.level / this.stepwisePowerSum.length)
                : add(this.value, Math.log10(this.stepwisePowerSum.base) * Math.floor(this.level / this.stepwisePowerSum.length));
            this.isZero = false;
        }
        else
            this.value = Math.log10(this.varBase) * (this.level + 1);
        this.level++;
        this.cost = this.costData.getCost(this.level - this.firstFreeCost);
    }
    reCalculate() {
        if (this.stepwisePowerSum.base !== 0) {
            const intPart = Math.floor(this.level / this.stepwisePowerSum.length);
            const modPart = this.level - intPart * this.stepwisePowerSum.length;
            const d = this.stepwisePowerSum.length / (this.stepwisePowerSum.base - 1);
            this.value = subtract(Math.log10(d + modPart) + Math.log10(this.stepwisePowerSum.base) * intPart, Math.log10(d));
        }
        else
            this.value = Math.log10(this.varBase) * this.level;
    }
}
function parseValue(val) {
    if (val === "Infinity")
        throw "Variable value reached Infinity";
    if (val === "0")
        return -Infinity;
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
    getCost(level) {
        return level < this.cutoff ? this.cost1.getCost(level) : this.cost2.getCost(level - this.cutoff);
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
    getCost(level) {
        return this.cost + this.costInc * level;
    }
}
export class StepwiseCost {
    constructor(stepLength, cost) {
        this.stepLength = stepLength;
        this.cost = cost;
    }
    getCost(level) {
        return this.cost.getCost(Math.floor(level / this.stepLength));
    }
}
