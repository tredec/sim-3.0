var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { global } from "../../Sim/main.js";
import { add, createResult, l10, subtract } from "../../Utils/helpers.js";
import { findIndex, sleep } from "../../Utils/helpers.js";
import Variable, { ExponentialCost } from "../../Utils/variable.js";
export default function t3(data) {
    return __awaiter(this, void 0, void 0, function* () {
        let sim = new t3Sim(data);
        let res = yield sim.simulate();
        return res;
    });
}
class t3Sim {
    constructor(data) {
        var _a;
        this.stratIndex = findIndex(data.strats, data.strat);
        this.strat = data.strat;
        this.theory = "T3";
        //theory
        this.cap = typeof data.cap === "number" && data.cap > 0 ? [data.cap, 1] : [Infinity, 0];
        this.recovery = (_a = data.recovery) !== null && _a !== void 0 ? _a : { value: 0, time: 0, recoveryTime: false };
        this.lastPub = data.rho;
        this.sigma = data.sigma;
        this.totMult = this.getTotMult(data.rho);
        this.curMult = 0;
        this.dt = global.dt;
        this.ddt = global.ddt;
        this.t = 0;
        this.ticks = 0;
        //currencies
        this.currencies = [0, 0, 0];
        this.maxRho = 0;
        //initialize variables
        this.variables = [
            new Variable({ cost: new ExponentialCost(10, 1.18099), stepwisePowerSum: { default: true }, firstFreeCost: true }),
            new Variable({ cost: new ExponentialCost(10, 1.308), stepwisePowerSum: { default: true } }),
            new Variable({ cost: new ExponentialCost(3000, 1.675), stepwisePowerSum: { default: true } }),
            new Variable({ cost: new ExponentialCost(20, 6.3496), varBase: 2 }),
            new Variable({ cost: new ExponentialCost(10, 2.74), varBase: 2 }),
            new Variable({ cost: new ExponentialCost(1000, 1.965), varBase: 2 }),
            new Variable({ cost: new ExponentialCost(500, 18.8343), varBase: 2 }),
            new Variable({ cost: new ExponentialCost(1e5, 3.65), varBase: 2 }),
            new Variable({ cost: new ExponentialCost(1e5, 2.27), varBase: 2 }),
            new Variable({ cost: new ExponentialCost(1e4, 1248.27), varBase: 2 }),
            new Variable({ cost: new ExponentialCost(1e3, 6.81744), varBase: 2 }),
            new Variable({ cost: new ExponentialCost(1e5, 2.98), varBase: 2 }) //c33
        ];
        this.boughtVars = [];
        //pub values
        this.tauH = 0;
        this.maxTauH = 0;
        this.pubT = 0;
        this.pubRho = 0;
        //milestones  [dimensions, b1exp, b2exp, b3exp]
        this.milestones = [0, 0, 0, 0];
        this.pubMulti = 0;
        this.conditions = this.getBuyingConditions();
        this.milestoneConditions = this.getMilestoneConditions();
        this.milestoneTree = this.getMilestoneTree();
        this.updateMilestones();
    }
    getBuyingConditions() {
        let conditions = [
            new Array(12).fill(true),
            [true, true, false, true, true, false, true, false, false, false, false, false],
            [true, true, true, false, true, false, false, true, true, true, true, false],
            [true, true, true, true, true, false, true, true, true, true, false, false],
            [true, true, true, true, true, false, true, true, true, true, true, false],
            [false, true, true, false, true, false, false, true, true, false, true, false],
            [
                () => this.curMult < 1,
                true,
                true,
                false,
                () => (this.curMult < 1 ? this.variables[4].cost + 2 < this.currencies[0] : true),
                false,
                false,
                true,
                true,
                () => this.curMult < 1,
                () => this.curMult < 1,
                () => this.curMult < 1
            ],
            [
                () => (this.curMult < 1 ? this.variables[0].cost + 1 < this.currencies[0] : false),
                () => this.variables[1].cost + l10(3) < this.currencies[1],
                () => this.variables[2].cost + l10(5) < this.currencies[2],
                false,
                () => (this.curMult < 1 ? this.variables[4].cost + 2 < this.currencies[0] : true),
                false,
                false,
                () => (this.curMult < 1 ? true : this.variables[7].cost + l10(8) < this.currencies[1]),
                true,
                () => this.curMult < 1,
                () => this.curMult < 1,
                () => (this.curMult < 1 ? this.variables[11].cost + 1 < this.currencies[2] : false)
            ],
            [
                () => this.variables[0].cost + l10(7) < Math.min(this.variables[3].cost, this.variables[6].cost),
                () => this.variables[1].cost + l10(7) < this.variables[4].cost,
                false,
                true,
                true,
                false,
                true,
                false,
                false,
                false,
                false,
                false
            ],
            [
                () => this.variables[0].cost + l10(8) < this.variables[9].cost,
                () => this.variables[1].cost + l10(5) < Math.min(this.variables[4].cost, this.variables[7].cost, this.variables[10].cost),
                () => this.variables[2].cost + l10(8) < this.variables[8].cost,
                false,
                true,
                false,
                false,
                true,
                true,
                true,
                true,
                false
            ],
            [
                () => this.variables[0].cost + l10(10) < Math.min(this.variables[6].cost, this.variables[9].cost),
                () => this.variables[1].cost + l10(4) < Math.min(this.variables[4].cost, this.variables[7].cost, this.variables[10].cost),
                () => this.variables[2].cost + l10(10) < this.variables[8].cost,
                false,
                true,
                false,
                true,
                true,
                true,
                true,
                true,
                false
            ],
            [
                () => this.variables[0].cost + l10(8) < Math.min(this.variables[3].cost, this.variables[6].cost, this.variables[9].cost),
                () => this.variables[1].cost + l10(5) < Math.min(this.variables[4].cost, this.variables[7].cost),
                () => this.variables[2].cost + l10(8) < this.variables[8].cost,
                true,
                true,
                false,
                true,
                true,
                true,
                true,
                false,
                false
            ],
            [
                () => this.variables[0].cost + l10(10) < Math.min(this.variables[3].cost, this.variables[6].cost, this.variables[9].cost),
                () => this.variables[1].cost + l10(4) < Math.min(this.variables[4].cost, this.variables[7].cost, this.variables[10].cost),
                () => this.variables[2].cost + l10(10) < this.variables[8].cost,
                true,
                true,
                false,
                true,
                true,
                true,
                true,
                true,
                false
            ],
            [
                () => (this.curMult < 2 ? this.variables[0].cost + l10(8) < this.variables[9].cost : false),
                () => (this.curMult < 2 ? this.variables[1].cost + l10(4) < Math.min(this.variables[4].cost, this.variables[10].cost) && this.variables[1].cost + l10(2) < this.variables[7].cost : true),
                () => this.variables[2].cost + l10(8) < this.variables[8].cost && this.variables[2].cost + l10(2) < this.variables[11].cost,
                false,
                true,
                false,
                false,
                () => (this.curMult < 2 ? this.variables[7].cost + l10(2) < Math.min(this.variables[4].cost, this.variables[10].cost) : true),
                true,
                () => this.curMult < 2,
                true,
                () => this.variables[11].cost + l10(4) < this.variables[8].cost
            ],
            [
                () => (this.lastPub - this.maxRho > 1 ? this.variables[0].cost + l10(8) < this.variables[9].cost : false),
                () => (this.curMult < 1.2 ? this.variables[1].cost + l10(5) < this.variables[10].cost : this.variables[1].cost + l10(8) < this.variables[4].cost) || this.curMult > 2.4,
                () => (this.curMult < 2.4 ? this.variables[2].cost + l10(8) < this.variables[8].cost : true),
                false,
                () => (this.curMult < 1.2 ? this.variables[4].cost + 2 < this.variables[10].cost : true),
                false,
                false,
                () => (this.curMult < 1.2 ? this.variables[7].cost + l10(1 / (2 / 5)) < this.variables[10].cost : this.variables[7].cost + l10(8) < this.variables[4].cost),
                true,
                () => this.lastPub - this.maxRho > 1,
                () => (this.curMult < 1.2 ? true : this.curMult < 2.4 ? this.variables[10].cost + l10(8) < this.variables[4].cost : false),
                () => (this.curMult < 1.2 ? this.variables[11].cost + l10(10) < this.variables[8].cost : false)
            ] //T3Play2
        ];
        conditions = conditions.map((elem) => elem.map((i) => (typeof i === "function" ? i : () => i)));
        return conditions;
    }
    getMilestoneConditions() {
        let conditions = [
            () => true,
            () => true,
            () => this.milestones[0] > 0,
            () => true,
            () => true,
            () => this.milestones[0] > 0,
            () => true,
            () => true,
            () => this.milestones[0] > 0,
            () => this.milestones[0] > 0,
            () => this.milestones[0] > 0,
            () => this.milestones[0] > 0
        ];
        return conditions;
    }
    getMilestoneTree() {
        let tree = [
            ...new Array(15).fill([
                [0, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 2, 0, 0],
                [0, 2, 1, 0],
                [0, 2, 2, 0],
                [1, 2, 2, 0],
                [1, 2, 2, 1],
                [1, 2, 2, 2]
            ])
        ];
        return tree;
    }
    getTotMult(val) {
        return Math.max(0, val * 0.147 + l10(3)) + l10(Math.pow((this.sigma / 20), (this.sigma < 65 ? 0 : this.sigma < 75 ? 1 : this.sigma < 85 ? 2 : 3)));
    }
    updateMilestones() {
        const stage = Math.min(7, Math.floor(Math.max(this.lastPub, this.maxRho) / 25));
        this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
    }
    simulate() {
        return __awaiter(this, void 0, void 0, function* () {
            let pubCondition = false;
            while (!pubCondition) {
                if (!global.simulating)
                    break;
                if ((this.ticks + 1) % 500000 === 0)
                    yield sleep();
                this.tick();
                if (this.currencies[0] > this.maxRho)
                    this.maxRho = this.currencies[0];
                if (this.lastPub < 175)
                    this.updateMilestones();
                this.curMult = Math.pow(10, (this.getTotMult(this.maxRho) - this.totMult));
                this.buyVariables();
                pubCondition = (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0]) && this.pubRho > 9;
                this.ticks++;
            }
            this.pubMulti = Math.pow(10, (this.getTotMult(this.pubRho) - this.totMult));
            let result = createResult(this, "");
            while (this.boughtVars[this.boughtVars.length - 1].timeStamp > this.pubT)
                this.boughtVars.pop();
            global.varBuy.push([result[7], this.boughtVars]);
            return result;
        });
    }
    tick() {
        let vb1 = this.variables[0].value * (1 + 0.05 * this.milestones[1]);
        let vb2 = this.variables[1].value * (1 + 0.05 * this.milestones[2]);
        let vb3 = this.variables[2].value * (1 + 0.05 * this.milestones[3]);
        let rhodot = add(add(this.variables[3].value + vb1, this.variables[4].value + vb2), this.variables[5].value + vb3);
        this.currencies[0] = add(this.currencies[0], l10(this.dt) + this.totMult + rhodot);
        let rho2dot = add(add(this.variables[6].value + vb1, this.variables[7].value + vb2), this.variables[8].value + vb3);
        this.currencies[1] = add(this.currencies[1], l10(this.dt) + this.totMult + rho2dot);
        let rho3dot = add(add(this.variables[9].value + vb1, this.variables[10].value + vb2), this.variables[11].value + vb3);
        this.currencies[2] = this.milestones[0] > 0 ? add(this.currencies[2], l10(this.dt) + this.totMult + rho3dot) : 0;
        this.t += this.dt / 1.5;
        this.dt *= this.ddt;
        if (this.maxRho < this.recovery.value)
            this.recovery.time = this.t;
        this.tauH = (this.maxRho - this.lastPub) / (this.t / 3600);
        if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < 9 || global.forcedPubTime !== Infinity) {
            this.maxTauH = this.tauH;
            this.pubT = this.t;
            this.pubRho = this.maxRho;
        }
    }
    buyVariables() {
        for (let i = this.variables.length - 1; i >= 0; i--) {
            let currencyIndex = i % 3;
            while (true) {
                if (this.currencies[currencyIndex] > this.variables[i].cost && this.conditions[this.stratIndex][i]() && this.milestoneConditions[i]()) {
                    if (this.maxRho + 5 > this.lastPub) {
                        let vars = ["b1", "b2", "b3", "c11", "c12", "c13", "c21", "c22", "c23", "c31", "c32", "c33"];
                        this.boughtVars.push({ variable: vars[i], level: this.variables[i].lvl + 1, cost: this.variables[i].cost, timeStamp: this.t });
                    }
                    this.currencies[currencyIndex] = subtract(this.currencies[currencyIndex], this.variables[i].cost);
                    this.variables[i].buy();
                }
                else
                    break;
            }
        }
    }
}
