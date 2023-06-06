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
import { add, createResult, l10, subtract } from "../../Utils/simHelpers.js";
import { findIndex, sleep } from "../../Utils/helperFunctions.js";
import Variable, { ExponentialCost } from "../../Utils/variable.js";
export default function t8(data) {
    return __awaiter(this, void 0, void 0, function* () {
        let sim = new t8Sim(data);
        let res = yield sim.simulate();
        return res;
    });
}
class t8Sim {
    constructor(data) {
        var _a;
        this.stratIndex = findIndex(data.strats, data.strat);
        this.strat = data.strat;
        this.theory = "T8";
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
        this.rho = 0;
        this.maxRho = 0;
        //initialize variables
        this.variables = [
            new Variable({ cost: new ExponentialCost(10, 1.5172), stepwisePowerSum: { default: true }, firstFreeCost: true }),
            new Variable({ cost: new ExponentialCost(20, 64), varBase: 2 }),
            new Variable({ cost: new ExponentialCost(1e2, 1.15 * Math.log2(3), true), varBase: 3 }),
            new Variable({ cost: new ExponentialCost(1e2, 1.15 * Math.log2(5), true), varBase: 5 }),
            new Variable({ cost: new ExponentialCost(1e2, 1.15 * Math.log2(7), true), varBase: 7 })
        ];
        //pub values
        this.tauH = 0;
        this.maxTauH = 0;
        this.pubT = 0;
        this.pubRho = 0;
        //milestones  [attractor, c3exp, c4exp, c5exp]
        this.milestones = [0, 0, 0, 0];
        //attractor stuff
        this.bounds = [
            [
                [0, -20, 20],
                [0, -27, 27],
                [24.5, 1, 48]
            ],
            [
                [0.5, -23, 24],
                [1, -25, 27],
                [20.5, 1, 40]
            ],
            [
                [1, -20, 22],
                [-1.5, -21, 18],
                [8, 0, 37]
            ]
        ];
        this.defaultStates = [
            [-6, -8, 26],
            [-10.6, -4.4, 28.6],
            [-6, 15, 0]
        ];
        this.dts = [0.02, 0.002, 0.00014];
        this.x = this.defaultStates[this.milestones[0]][0];
        this.y = this.defaultStates[this.milestones[0]][1];
        this.z = this.defaultStates[this.milestones[0]][2];
        this.dx = 0;
        this.dy = 0;
        this.dz = 0;
        this.msTimer = 0;
        this.result = [];
        this.pubMulti = 0;
        this.conditions = this.getBuyingConditions();
        this.milestoneConditions = this.getMilestoneConditions();
        this.milestoneTree = this.getMilestoneTree();
        this.updateMilestones();
    }
    getBuyingConditions() {
        let conditions = [
            [true, true, true, true, true],
            [true, true, false, true, true],
            [true, true, true, true, false],
            [true, true, false, true, false],
            [() => this.curMult < 1.6, true, () => this.curMult < 2.3, true, () => this.curMult < 2.3],
            [() => this.variables[0].cost + 1 < Math.min(this.variables[1].cost, this.variables[3].cost), true, false, true, true],
            [() => this.variables[0].cost + 1 < Math.min(this.variables[1].cost, this.variables[3].cost), true, true, true, false],
            [() => this.variables[0].cost + 1 < Math.min(this.variables[1].cost, this.variables[3].cost), true, false, true, false],
            [() => this.variables[0].cost + 1 < Math.min(this.variables[1].cost, this.variables[3].cost), true, true, true, true],
            [
                () => this.variables[0].cost + l10(8) < Math.min(this.variables[1].cost, this.variables[3].cost),
                true,
                () => this.variables[2].cost + l10(2.5) < Math.min(this.variables[1].cost, this.variables[3].cost),
                true,
                () => this.variables[4].cost + l10(4) < Math.min(this.variables[1].cost, this.variables[3].cost)
            ],
            [
                () => this.variables[0].cost + l10(8) < Math.min(this.variables[1].cost, this.variables[3].cost),
                true,
                () => this.variables[2].cost + l10(2.5) < Math.min(this.variables[1].cost, this.variables[3].cost),
                true,
                () => this.variables[4].cost + l10(2.5) < Math.min(this.variables[1].cost, this.variables[3].cost)
            ] //T8PlaySolarswap
        ];
        conditions = conditions.map((elem) => elem.map((i) => (typeof i === "function" ? i : () => i)));
        return conditions;
    }
    getMilestoneConditions() {
        let conditions = [() => true, () => true, () => true, () => true, () => true];
        return conditions;
    }
    getMilestoneTree() {
        let tree = [
            [
                [0, 0, 0, 0],
                [1, 0, 0, 0],
                [2, 0, 0, 0],
                [0, 0, 0, 3],
                [1, 0, 3, 0],
                [2, 0, 3, 0],
                [2, 0, 3, 1],
                [2, 0, 3, 2],
                [2, 0, 3, 3],
                [2, 1, 3, 3],
                [2, 2, 3, 3],
                [2, 3, 3, 3]
            ],
            [
                [0, 0, 0, 0],
                [1, 0, 0, 0],
                [2, 0, 0, 0],
                [2, 0, 1, 0],
                [2, 0, 2, 0],
                [2, 0, 3, 0],
                [2, 0, 3, 1],
                [2, 0, 3, 2],
                [2, 0, 3, 3]
            ],
            [
                [0, 0, 0, 0],
                [1, 0, 0, 0],
                [2, 0, 0, 0],
                [2, 0, 1, 0],
                [2, 0, 2, 0],
                [2, 0, 3, 0],
                [2, 1, 3, 0],
                [2, 2, 3, 0],
                [2, 3, 3, 0]
            ],
            [
                [0, 0, 0, 0],
                [1, 0, 0, 0],
                [2, 0, 0, 0],
                [2, 0, 1, 0],
                [2, 0, 2, 0],
                [2, 0, 3, 0]
            ],
            [
                [0, 0, 0, 0],
                [1, 0, 0, 0],
                [2, 0, 0, 0],
                [0, 0, 0, 3],
                [1, 0, 3, 0],
                [2, 0, 3, 0],
                [2, 0, 3, 1],
                [2, 0, 3, 2],
                [2, 0, 3, 3],
                [2, 1, 3, 3],
                [2, 2, 3, 3],
                [2, 3, 3, 3]
            ],
            [
                [0, 0, 0, 0],
                [1, 0, 0, 0],
                [2, 0, 0, 0],
                [2, 0, 1, 0],
                [2, 0, 2, 0],
                [2, 0, 3, 0],
                [2, 0, 3, 1],
                [2, 0, 3, 2],
                [2, 0, 3, 3]
            ],
            [
                [0, 0, 0, 0],
                [1, 0, 0, 0],
                [2, 0, 0, 0],
                [2, 0, 1, 0],
                [2, 0, 2, 0],
                [2, 0, 3, 0],
                [2, 1, 3, 0],
                [2, 2, 3, 0],
                [2, 3, 3, 0]
            ],
            [
                [0, 0, 0, 0],
                [1, 0, 0, 0],
                [2, 0, 0, 0],
                [2, 0, 1, 0],
                [2, 0, 2, 0],
                [2, 0, 3, 0]
            ],
            ...new Array(3).fill([
                [0, 0, 0, 0],
                [1, 0, 0, 0],
                [2, 0, 0, 0],
                [0, 0, 0, 3],
                [1, 0, 3, 0],
                [2, 0, 3, 0],
                [2, 0, 3, 1],
                [2, 0, 3, 2],
                [2, 0, 3, 3],
                [2, 1, 3, 3],
                [2, 2, 3, 3],
                [2, 3, 3, 3]
            ]) //t8d, t8Play, t8PlaySolarswap
        ];
        return tree;
    }
    getTotMult(val) {
        return Math.max(0, val * 0.15) + l10(Math.pow((this.sigma / 20), (this.sigma < 65 ? 0 : this.sigma < 75 ? 1 : this.sigma < 85 ? 2 : 3)));
    }
    updateMilestones() {
        const stage = Math.min(11, Math.floor(Math.max(this.lastPub, this.maxRho) / 20));
        this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
    }
    dn(ix = this.x, iy = this.y, iz = this.z) {
        if (this.milestones[0] === 0) {
            this.dx = 10 * (iy - ix);
            this.dy = ix * (28 - iz) - iy;
            this.dz = ix * iy - (8 * iz) / 3;
        }
        if (this.milestones[0] === 1) {
            this.dx = 10 * (40 * (iy - ix));
            this.dy = 10 * (-12 * ix - ix * iz + 28 * iy);
            this.dz = 10 * (ix * iy - 3 * iz);
        }
        if (this.milestones[0] === 2) {
            this.dx = 500 * (-iy - iz);
            this.dy = 500 * (ix + 0.1 * iy);
            this.dz = 500 * (0.1 + iz * (ix - 14));
        }
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
                if (this.rho > this.maxRho)
                    this.maxRho = this.rho;
                if (this.lastPub < 220)
                    this.updateMilestones();
                this.curMult = Math.pow(10, (this.getTotMult(this.maxRho) - this.totMult));
                this.buyVariables();
                pubCondition = (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0]) && this.pubRho > 8;
                this.ticks++;
            }
            this.pubMulti = Math.pow(10, (this.getTotMult(this.pubRho) - this.totMult));
            this.result = createResult(this, "");
            return this.result;
        });
    }
    tick() {
        this.dn();
        let midpointx = this.x + this.dx * 0.5 * this.dts[this.milestones[0]];
        let midpointy = this.y + this.dy * 0.5 * this.dts[this.milestones[0]];
        let midpointz = this.z + this.dz * 0.5 * this.dts[this.milestones[0]];
        this.dn(midpointx, midpointy, midpointz);
        this.x += this.dx * this.dts[this.milestones[0]];
        this.y += this.dy * this.dts[this.milestones[0]];
        this.z += this.dz * this.dts[this.milestones[0]];
        this.dn();
        let xlowerBound = (this.bounds[this.milestones[0]][0][1] - this.bounds[this.milestones[0]][0][0]) * 5 + this.bounds[this.milestones[0]][0][0];
        let xupperBound = (this.bounds[this.milestones[0]][0][2] - this.bounds[this.milestones[0]][0][0]) * 5 + this.bounds[this.milestones[0]][0][0];
        let ylowerBound = (this.bounds[this.milestones[0]][1][1] - this.bounds[this.milestones[0]][1][0]) * 5 + this.bounds[this.milestones[0]][1][0];
        let yupperBound = (this.bounds[this.milestones[0]][1][2] - this.bounds[this.milestones[0]][1][0]) * 5 + this.bounds[this.milestones[0]][1][0];
        let zlowerBound = (this.bounds[this.milestones[0]][2][1] - this.bounds[this.milestones[0]][2][0]) * 5 + this.bounds[this.milestones[0]][2][0];
        let zupperBound = (this.bounds[this.milestones[0]][2][2] - this.bounds[this.milestones[0]][2][0]) * 5 + this.bounds[this.milestones[0]][2][0];
        if (this.x < xlowerBound || this.x > xupperBound || this.y < ylowerBound || this.y > yupperBound || this.z < zlowerBound || this.z > zupperBound) {
            this.x = this.defaultStates[this.milestones[0]][0];
            this.y = this.defaultStates[this.milestones[0]][1];
            this.z = this.defaultStates[this.milestones[0]][2];
        }
        this.dn();
        this.msTimer++;
        if (this.msTimer == 335 && this.stratIndex === 10) {
            this.x = this.defaultStates[this.milestones[0]][0];
            this.y = this.defaultStates[this.milestones[0]][1];
            this.z = this.defaultStates[this.milestones[0]][2];
            this.msTimer = 0;
        }
        let vc3 = this.variables[2].value * (1 + 0.05 * this.milestones[1]);
        let vc4 = this.variables[3].value * (1 + 0.05 * this.milestones[2]);
        let vc5 = this.variables[4].value * (1 + 0.05 * this.milestones[3]);
        let dx2Term = vc3 + l10(this.dx * this.dx);
        let dy2Term = vc4 + l10(this.dy * this.dy);
        let dz2Term = vc5 + l10(this.dz * this.dz);
        let rhodot = l10(this.dt) + this.totMult + this.variables[0].value + this.variables[1].value + add(add(dx2Term, dy2Term), dz2Term) / 2 - 2;
        this.rho = add(this.rho, rhodot);
        this.t += this.dt / 1.5;
        this.dt *= this.ddt;
        if (this.maxRho < this.recovery.value)
            this.recovery.time = this.t;
        this.tauH = (this.maxRho - this.lastPub) / (this.t / 3600);
        if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < 8 || global.forcedPubTime !== Infinity) {
            this.maxTauH = this.tauH;
            this.pubT = this.t;
            this.pubRho = this.maxRho;
        }
    }
    buyVariables() {
        for (let i = this.variables.length - 1; i >= 0; i--)
            while (true) {
                if (this.rho > this.variables[i].cost && this.conditions[this.stratIndex][i]() && this.milestoneConditions[i]()) {
                    this.rho = subtract(this.rho, this.variables[i].cost);
                    this.variables[i].buy();
                }
                else
                    break;
            }
    }
}
