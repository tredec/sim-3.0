import { global } from "../Sim/main.js";
import jsonData from "../Data/data.json";
export class theoryClass {
    constructor(data) {
        var _a;
        this.strat = data.strat;
        this.theory = data.theory;
        this.tauFactor = jsonData.theories[data.theory].tauFactor;
        //theory
        this.cap = typeof data.cap === "number" && data.cap > 0 ? [data.cap, 1] : [Infinity, 0];
        this.recovery = (_a = data.recovery) !== null && _a !== void 0 ? _a : { value: 0, time: 0, recoveryTime: false };
        this.lastPub = data.rho;
        this.sigma = data.sigma;
        this.totMult = 0;
        this.dt = global.dt;
        this.ddt = global.ddt;
        this.t = 0;
        this.ticks = 0;
        //currencies
        this.maxRho = 0;
        //initialize variables
        this.varNames = [];
        this.variables = [];
        this.boughtVars = [];
        //pub values
        this.tauH = 0;
        this.maxTauH = 0;
        this.pubT = 0;
        this.pubRho = 0;
        this.milestones = [];
        this.pubMulti = 0;
        this.conditions = [];
        this.milestoneConditions = [];
        this.milestoneTree = [];
    }
}
