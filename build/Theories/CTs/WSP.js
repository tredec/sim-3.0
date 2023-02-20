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
import Variable from "../../Utils/variable.js";
import { getTauFactor } from "../../Sim/Components/helpers.js";
export default function wsp(data) {
    return __awaiter(this, void 0, void 0, function* () {
        let sim = new wspSim(data);
        let res = yield sim.simulate();
        return res;
    });
}
class wspSim {
    constructor(data) {
        var _a;
        this.srK_helper = (x) => {
            let x2 = x * x;
            return Math.log(x2 + 1 / 6 + 1 / 120 / x2 + 1 / 810 / x2 / x2) / 2 - 1;
        };
        this.sineRatioK = (n, x, K = 5) => {
            if (n < 1 || x >= n + 1)
                return 0;
            let N = n + 1 + K, x2 = x * x, L1 = this.srK_helper(N + x), L2 = this.srK_helper(N - x), L3 = this.srK_helper(N), result = N * (L1 + L2 - 2 * L3) + x * (L1 - L2) - Math.log(1 - x2 / N / N) / 2;
            for (let k = n + 1; k < N; ++k)
                result -= Math.log(1 - x2 / k / k);
            return Math.LOG10E * result;
        };
        this.stratIndex = findIndex(data.strats, data.strat);
        this.strat = data.strat;
        this.theory = "WSP";
        this.tauFactor = getTauFactor(this.theory);
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
        this.q = 0;
        //initialize variables
        this.variables = [
            new Variable({ lvl: 1, cost: 10, costInc: Math.pow(2, (3.38 / 4)), value: 1, stepwisePowerSum: { default: true } }),
            new Variable({ cost: 1000, costInc: Math.pow(2, (3.38 * 3)), varBase: 2 }),
            new Variable({ cost: 20, costInc: Math.pow(2, 3.38) }),
            new Variable({ cost: 50, costInc: Math.pow(2, (3.38 / 1.5)), stepwisePowerSum: { base: 2, length: 50 } }),
            new Variable({ cost: 1e10, costInc: Math.pow(2, (3.38 * 10)), varBase: 2 })
        ];
        this.S = 0;
        this.boughtVars = [];
        //pub values
        this.tauH = 0;
        this.maxTauH = 0;
        this.pubT = 0;
        this.pubRho = 0;
        //milestones  [q1exp, c2term, nboost]
        this.milestones = [0, 0, 0];
        this.result = [];
        this.pubMulti = 0;
        this.conditions = this.getBuyingConditions();
        this.milestoneConditions = this.getMilestoneConditions();
        this.milestoneTree = this.getMilestoneTree();
        this.updateMilestones();
    }
    getBuyingConditions() {
        let c1weight = 0;
        if (this.lastPub >= 25)
            c1weight = l10(3);
        if (this.lastPub >= 40)
            c1weight = 1;
        if (this.lastPub >= 200)
            c1weight = l10(50);
        if (this.lastPub >= 400)
            c1weight = 3;
        if (this.lastPub >= 700)
            c1weight = 10000;
        let conditions = [
            [true, true, true, true, true],
            [true, true, true, () => this.lastPub < 450 || this.t < 15, true],
            [
                () => this.variables[0].cost + l10(8 + (this.variables[0].lvl % 10)) < Math.min(this.variables[1].cost, this.variables[2].cost, this.milestones[1] > 0 ? this.variables[4].cost : Infinity),
                true,
                true,
                () => this.variables[3].cost + c1weight < Math.min(this.variables[1].cost, this.variables[2].cost, this.milestones[1] > 0 ? this.variables[4].cost : Infinity) || this.t < 15,
                true
            ]
        ];
        conditions = conditions.map((elem) => elem.map((i) => (typeof i === "function" ? i : () => i)));
        return conditions;
    }
    getMilestoneConditions() {
        let conditions = [() => true, () => true, () => true, () => true, () => this.milestones[1] > 0];
        return conditions;
    }
    getMilestoneTree() {
        let tree = [
            ...new Array(3).fill([
                [0, 0, 0],
                [0, 0, 1],
                [0, 0, 2],
                [0, 0, 3],
                [0, 1, 3],
                [1, 1, 3],
                [2, 1, 3],
                [3, 1, 3],
                [4, 1, 3]
            ]) //WSP WSPStopC1 WSPdStopC1
        ];
        return tree;
    }
    getTotMult(val) {
        return Math.max(0, val * this.tauFactor * 1.5);
    }
    updateMilestones() {
        let stage = 0;
        let points = [10, 25, 40, 55, 70, 100, 140, 200];
        for (let i = 0; i < points.length; i++) {
            if (Math.max(this.lastPub, this.maxRho) >= points[i])
                stage = i + 1;
        }
        this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
    }
    updateS() {
        let vn = l10(this.variables[2].value);
        let vc1 = this.variables[3].value;
        let chi = Math.pow(10, (l10(Math.PI) + vc1 + vn - add(vc1, vn - l10(3) * this.milestones[2]))) + 1;
        this.S = this.sineRatioK(this.variables[2].value, chi / Math.PI);
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
                if (this.lastPub < 200)
                    this.updateMilestones();
                this.curMult = Math.pow(10, (this.getTotMult(this.maxRho) - this.totMult));
                this.buyVariables();
                pubCondition = (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0] || this.curMult > 15) && this.pubRho > 8;
                this.ticks++;
            }
            this.pubMulti = Math.pow(10, (this.getTotMult(this.pubRho) - this.totMult));
            this.result = createResult(this, "");
            if (this.stratIndex === 2) {
                while (this.boughtVars[this.boughtVars.length - 1].timeStamp > this.pubT)
                    this.boughtVars.pop();
                global.varBuy.push([this.result[7], this.boughtVars]);
            }
            return this.result;
        });
    }
    tick() {
        let vq1 = this.variables[0].value * (1 + 0.01 * this.milestones[0]);
        let qdot = Math.max(0, l10(this.dt) + this.S + this.variables[4].value);
        this.q = add(this.q, qdot);
        let rhodot = this.totMult + vq1 + this.variables[1].value + this.q + l10(this.dt);
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
        let updateS_flag = false;
        for (let i = this.variables.length - 1; i >= 0; i--)
            while (true) {
                if (this.rho > this.variables[i].cost && this.conditions[this.stratIndex][i]() && this.milestoneConditions[i]()) {
                    this.rho = subtract(this.rho, this.variables[i].cost);
                    if (this.maxRho + 5 > this.lastPub) {
                        let vars = ["q1", "q2", "n", "c1", "c2"];
                        this.boughtVars.push({ variable: vars[i], level: this.variables[i].lvl + 1, cost: this.variables[i].cost, timeStamp: this.t });
                    }
                    this.variables[i].buy();
                    if (i === 2 || i === 4)
                        updateS_flag = true;
                }
                else
                    break;
            }
        if (updateS_flag)
            this.updateS();
    }
}
