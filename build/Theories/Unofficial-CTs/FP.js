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
import { add, createResult, l10, subtract, sleep } from "../../Utils/helpers.js";
import Variable, { CompositeCost, ExponentialCost } from "../../Utils/variable.js";
import jsonData from "../../Data/data.json" assert { type: "json" };
export default function fp(data) {
    return __awaiter(this, void 0, void 0, function* () {
        let sim = new fpSim(data);
        let res = yield sim.simulate();
        return res;
    });
}
let un = [
    0, 9749, 38997, 92821, 155989, 271765, 371285, 448661, 623957, 808853, 1087061, 1415829, 1485141, 1663893, 1794645, 2068245, 2495829, 2681877, 3235413, 3527445, 4348245, 5600149, 5663317, 5807893, 5940565,
    6200341, 6655573, 6841621, 7178581, 7607701, 8272981, 9793813, 9983317, 10246549, 10727509, 11309845, 12941653, 13288981, 14109781, 15594133, 17392981, 22369685, 22400597, 22488341, 22653269, 22839317, 23231573,
    23488661, 23762261, 24243221, 24801365, 25677461, 26622293, 26830229, 27366485, 27800213, 28714325, 29858837, 30430805, 32081045, 33091925, 35461013, 39175253, 39364757, 39933269, 40196501, 40986197, 42341525,
    42910037, 43952021, 45239381, 47328533, 51766613, 52321301, 53155925, 54567701, 56439125, 61199765, 62376533, 64838933, 69571925, 74595221, 89478741, 89511189, 89602389, 89763861, 89953365, 90387093, 90613077,
    90872853, 91357269, 91915413, 92926293, 93732885, 93954645, 94480533, 95049045, 95838741, 96972885, 97555221, 99205461, 100247445, 102709845, 106289301, 106489173, 107042709, 107320917, 108110613, 109465941,
    110024085, 111200853, 112394901, 114857301, 118877205, 119435349, 120311445, 121723221, 123594645, 128324181, 129625365, 132367701, 136696341, 141844053, 156588693, 156701013, 156964245, 157459029, 158027541,
    159733077, 159996309, 160786005, 162239253, 163944789, 167070741, 169366101, 170062485, 171640149, 173304213, 175808085, 179086101, 180957525, 185783829, 189314133, 196701333, 207066453, 207624597, 209285205,
    210161301, 212623701, 216565269, 218270805, 222174357, 225756501, 232770453, 244799061, 246473493, 249506133, 253368213, 259355733, 273171093, 278287701, 285394965, 298380885, 314103957, 357914965, 357953557,
    358044757, 358209685, 358409557, 358962709, 359055445, 359318677, 359813461, 360371605, 361548373, 362178709, 362452309, 362933269, 363491413, 364367509, 365429077, 366052885, 367661653, 368962837, 371705173,
    374740885, 374931541, 375481621, 375818581, 376608277, 377922133, 378490645, 380196181, 380985877, 383354965, 387323029, 387891541, 388933525, 390220885, 392310037, 396821845
];
let stepwiseSum = (level, base, length) => {
    if (level <= length)
        return level;
    level -= length;
    let cycles = Math.floor(level / length);
    let mod = level - cycles * length;
    return base * (cycles + 1) * ((length * cycles) / 2 + mod) + length + level;
};
class fpSim {
    constructor(data) {
        var _a;
        this.strat = data.strat;
        this.theory = "FP";
        this.tauFactor = jsonData.theories.FP.tauFactor;
        //theory
        this.cap = typeof data.cap === "number" && data.cap > 0 ? [data.cap, 1] : [Infinity, 0];
        this.recovery = (_a = data.recovery) !== null && _a !== void 0 ? _a : { value: 0, time: 0, recoveryTime: false };
        this.lastPub = data.rho;
        this.sigma = data.sigma;
        this.totMult = data.rho < 9 ? 0 : this.getTotMult(data.rho);
        this.curMult = 0;
        this.pubUnlock = 12;
        this.dt = global.dt;
        this.ddt = global.ddt;
        this.t = 0;
        this.ticks = 0;
        //currencies
        this.rho = 0;
        this.maxRho = 0;
        this.q = 0;
        this.r = 0;
        this.t_var = 0;
        //initialize variables
        this.variables = [
            new Variable({ cost: new ExponentialCost(1e4, 1e4) }),
            new Variable({ cost: new ExponentialCost(10, 1.4), stepwisePowerSum: { base: 150, length: 100 }, firstFreeCost: true }),
            new Variable({ cost: new CompositeCost(15, new ExponentialCost(1e15, 40), new ExponentialCost(1e41, 16.42)), varBase: 2 }),
            new Variable({ cost: new ExponentialCost(1e35, 12), stepwisePowerSum: { base: 10, length: 10 }, firstFreeCost: true }),
            new Variable({ cost: new ExponentialCost(1e79, 1e3) }),
            new Variable({ cost: new CompositeCost(285, new ExponentialCost(1e75, 20), new ExponentialCost("1e440", 150)), stepwisePowerSum: { base: 2, length: 5 }, firstFreeCost: true }),
            new Variable({ cost: new ExponentialCost(1e4, 3e6) }),
            new Variable({ cost: new ExponentialCost("1e730", 1e30) })
        ];
        this.boughtVars = [];
        this.T_n = 1;
        this.U_n = 1;
        this.S_n = 0;
        this.n = 1;
        this.prevN = 1;
        this.updateN_flag = true;
        //pub values
        this.tauH = 0;
        this.maxTauH = 0;
        this.pubT = 0;
        this.pubRho = 0;
        //milestones  [q1exp, c2term, nboost]
        this.milestones = { snexp: 0, fractals: 0, nboost: 0, snboost: 0, sterm: 0, expterm: 0 };
        this.pubMulti = 0;
        this.conditions = this.getBuyingConditions();
        this.milestoneConditions = this.getMilestoneConditions();
        this.milestoneTree = this.getMilestoneTree();
        this.updateMilestones();
    }
    getBuyingConditions() {
        const conditions = {
            FP: new Array(10).fill(true)
        };
        const condition = conditions[this.strat].map((v) => (typeof v === "function" ? v : () => v));
        return condition;
    }
    getMilestoneConditions() {
        let conditions = [
            () => this.variables[0].lvl < 4,
            () => true,
            () => true,
            () => this.milestones.fractals > 0,
            () => this.milestones.fractals > 0,
            () => this.milestones.fractals > 1,
            () => true,
            () => this.milestones.sterm > 0
        ];
        return conditions;
    }
    getMilestoneTree() {
        const tree = {
            FP: [
                { snexp: 0, fractals: 0, nboost: 0, snboost: 0, sterm: 0, expterm: 0 },
                { snexp: 0, fractals: 1, nboost: 0, snboost: 0, sterm: 0, expterm: 0 },
                { snexp: 0, fractals: 2, nboost: 0, snboost: 0, sterm: 0, expterm: 0 },
                { snexp: 0, fractals: 2, nboost: 1, snboost: 0, sterm: 0, expterm: 0 },
                { snexp: 0, fractals: 2, nboost: 2, snboost: 0, sterm: 0, expterm: 0 },
                { snexp: 1, fractals: 2, nboost: 2, snboost: 0, sterm: 0, expterm: 0 },
                { snexp: 2, fractals: 2, nboost: 2, snboost: 0, sterm: 0, expterm: 0 },
                { snexp: 3, fractals: 2, nboost: 2, snboost: 0, sterm: 0, expterm: 0 },
                { snexp: 3, fractals: 2, nboost: 2, snboost: 1, sterm: 0, expterm: 0 },
                { snexp: 3, fractals: 2, nboost: 2, snboost: 1, sterm: 1, expterm: 0 },
                { snexp: 3, fractals: 2, nboost: 2, snboost: 1, sterm: 1, expterm: 1 }
            ]
        };
        return tree[this.strat];
    }
    getTotMult(val) {
        return Math.max(0, val * this.tauFactor * 1.324 + l10(5));
    }
    updateMilestones() {
        let stage = 0;
        let points = [23, 90, 175, 300, 385, 420, 550, 600, 700, 1500];
        for (let i = 0; i < points.length; i++) {
            if (Math.max(this.lastPub, this.maxRho) >= points[i])
                stage = i + 1;
        }
        this.milestones = this.milestoneTree[Math.min(this.milestoneTree.length - 1, stage)];
        // if (this.lastPub > 700 && this.lastPub < 900) {
        //   if (this.ticks % 40 < 20) this.milestones.sterm = 0;
        //   else this.milestones.sterm = 1;
        // }
    }
    approx(n) {
        n++;
        return l10(1 / 6) + add(l10(2) * (2 * n), l10(2));
    }
    T(n) {
        if (n === 0)
            return 0;
        let log2N = Math.log2(n);
        if (log2N % 1 === 0)
            return (Math.pow(2, (2 * log2N + 1)) + 1) / 3;
        let i = n - Math.pow(2, Math.floor(log2N));
        return this.T(Math.pow(2, Math.floor(log2N))) + 2 * this.T(i) + this.T(i + 1) - 1;
    }
    u(n) {
        if (n < 2)
            return n;
        return 4 * Math.pow(3, (this.wt(n - 1) - 1));
    }
    wt(n) {
        let temp = 0;
        for (let k = 1;; k++) {
            if (Math.pow(2, k) > n)
                break;
            temp += Math.floor(n / Math.pow(2, k));
        }
        return n - temp;
    }
    U(n) {
        let p = n - (n % 100);
        let temp = this.prevN > p ? this.U_n : un[Math.floor(n / 100)];
        for (let i = this.prevN > p ? this.prevN + 1 : p + 1; i <= n; i++)
            temp += this.u(i);
        return temp;
    }
    S(n) {
        if (n === 0)
            return 0;
        if (this.milestones.snboost === 0)
            return l10(3) * (n - 1);
        return l10(1 / 3) + subtract(l10(2) + l10(3) * n, l10(3));
    }
    getS(level) {
        let cutoffs = [32, 38];
        if (level < cutoffs[0])
            return 1 + level * 0.15;
        if (level < cutoffs[1])
            return this.getS(cutoffs[0] - 1) + 0.15 + (level - cutoffs[0]) * 0.2;
        return this.getS(cutoffs[1] - 1) + 0.2 + (level - cutoffs[1]) * 0.15;
    }
    updateN() {
        this.T_n = this.T(this.n);
        this.U_n = this.U(this.n);
        this.S_n = this.S(Math.floor(Math.sqrt(this.n)));
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
                this.updateMilestones();
                this.curMult = Math.pow(10, (this.getTotMult(this.maxRho) - this.totMult));
                this.buyVariables();
                pubCondition = (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0] || this.curMult > 1000) && this.pubRho > this.pubUnlock;
                this.ticks++;
            }
            this.pubMulti = Math.pow(10, (this.getTotMult(this.pubRho) - this.totMult));
            let result = createResult(this, ` ${this.variables[7].lvl}`);
            while (this.boughtVars[this.boughtVars.length - 1].timeStamp > this.pubT)
                this.boughtVars.pop();
            global.varBuy.push([result[7], this.boughtVars]);
            return result;
        });
    }
    tick() {
        if (this.updateN_flag) {
            this.prevN = this.n;
            const term2 = this.milestones.nboost > 0 ? Math.floor(stepwiseSum(Math.max(0, this.variables[6].lvl - 30), 1, 35) * 2) : 0;
            const term3 = this.milestones.nboost > 1 ? Math.floor(stepwiseSum(Math.max(0, this.variables[6].lvl - 69), 1, 30) * 2.4) : 0;
            this.n = Math.min(20000, 1 + stepwiseSum(this.variables[6].lvl, 1, 40) + term2 + term3);
            this.updateN();
            this.updateN_flag = false;
        }
        let vq1 = this.variables[3].value - l10(1 + 1000 / Math.pow(this.variables[3].lvl, 1.5));
        let vr1 = this.variables[5].value - l10(1 + 1e9 / Math.pow(this.variables[5].lvl, 4));
        let A = this.approx(this.variables[4].lvl + 1);
        this.t_var += (this.variables[0].lvl / 5 + 0.2) * this.dt;
        let qdot = vq1 + A + l10(this.U_n) * (7 + (this.milestones.sterm > 0 ? this.getS(this.variables[7].lvl) : 0)) - 3;
        this.q = this.milestones.fractals > 0 ? add(this.q, qdot + l10(this.dt)) : this.q;
        let rdot;
        if (this.milestones.expterm < 1)
            rdot = vr1 + (l10(this.T_n) + l10(this.U_n)) * l10(this.n) + this.S_n * (1 + 0.6 * this.milestones.snexp);
        else
            rdot = vr1 + (l10(this.T_n) + l10(this.U_n)) * (l10(this.U_n * 2) / 2) + this.S_n * (1 + 0.6 * this.milestones.snexp);
        this.r = this.milestones.fractals > 1 ? add(this.r, rdot + l10(this.dt)) : this.r;
        let rhodot = this.totMult + this.variables[1].value + this.variables[2].value + l10(this.T_n) * (7 + (this.milestones.sterm > 0 ? this.getS(this.variables[7].lvl) - 2 : 0)) + l10(this.t_var);
        rhodot += this.milestones.fractals > 0 ? this.q : 0;
        rhodot += this.milestones.fractals > 1 ? this.r : 0;
        this.rho = add(this.rho, rhodot + l10(this.dt));
        this.t += this.dt / 1.5;
        this.dt *= this.ddt;
        if (this.maxRho < this.recovery.value)
            this.recovery.time = this.t;
        this.tauH = (this.maxRho - this.lastPub) / (this.t / 3600);
        if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < this.pubUnlock || global.forcedPubTime !== Infinity) {
            this.maxTauH = this.tauH;
            this.pubT = this.t;
            this.pubRho = this.maxRho;
        }
    }
    buyVariables() {
        for (let i = this.variables.length - 1; i >= 0; i--)
            while (true) {
                if (this.rho > this.variables[i].cost && this.conditions[i]() && this.milestoneConditions[i]()) {
                    if (this.maxRho + 5 > this.lastPub) {
                        let vars = ["tdot", "c1", "c2", "q1", "q2", "r1", "n1", "s"];
                        this.boughtVars.push({ variable: vars[i], level: this.variables[i].lvl + 1, cost: this.variables[i].cost, timeStamp: this.t });
                    }
                    this.rho = subtract(this.rho, this.variables[i].cost);
                    this.variables[i].buy();
                    if (i === 6 || i === 7 || i === 8)
                        this.updateN_flag = true;
                }
                else
                    break;
            }
    }
}
