import { global } from "../main.js";
import { logToExp, simResult, theoryData } from "../Utils/simHelpers.js";
import { add, arr, createResult, l10, subtract } from "../Utils/simHelpers.js";
import { findIndex, sleep } from "../Utils/helperFunctions.js";
import { variableInterface } from "../Utils/simHelpers.js";
import Variable from "../variable.js";

export default async function t1(data: theoryData): Promise<simResult> {
  let sim = new t1Sim(data);
  let res = await sim.simulate();
  return res;
}

class t1Sim {
  conditions: Array<Array<boolean | Function>>;
  milestoneConditions: Array<Function>;
  milestoneTree: Array<Array<Array<number>>>;

  stratIndex: number;
  strat: string;
  theory: string;
  //theory
  cap: Array<number>;
  recovery: { value: number; time: number; recoveryTime: boolean };
  lastPub: number;
  sigma: number;
  totMult: number;
  curMult: number;
  dt: number;
  ddt: number;
  t: number;
  ticks: number;
  //currencies
  rho: number;
  maxRho: number;
  //initialize variables
  variables: Array<variableInterface>;
  term1: number;
  term2: number;
  term3: number;
  termRatio: number;
  c3Ratio: number;
  //pub values
  tauH: number;
  maxTauH: number;
  pubT: number;
  pubRho: number;
  //milestones  [terms, c1exp, multQdot]
  milestones: Array<number>;
  pubMulti: number;
  result: Array<any>;

  getBuyingConditions() {
    let conditions: Array<Array<boolean | Function>> = [
      [...arr(6, true)], //t1
      [true, true, false, false, true, true], //t1C34
      [true, true, false, false, false, true], //t1C4
      [
        () => this.variables[0].cost + 1 < this.rho,
        () => this.variables[1].cost + l10(1.11) < this.rho,
        () => this.variables[2].cost + this.termRatio + 1 <= this.rho,
        () => this.variables[3].cost + this.termRatio <= this.rho,
        () => this.variables[4].cost + l10(this.c3Ratio) < this.rho,
        true,
      ], //t1ratio
      [
        () =>
          this.variables[0].cost + l10(5) <= this.rho &&
          this.variables[0].cost + l10(6 + (this.variables[0].lvl % 10)) <= this.variables[1].cost &&
          this.variables[0].cost + l10(15 + (this.variables[0].lvl % 10)) < (this.milestones[3] > 0 ? this.variables[5].cost : 1000),
        () => this.variables[1].cost + l10(1.11) < this.rho,
        () => this.variables[2].cost + this.termRatio + 1 <= this.rho,
        () => this.variables[3].cost + this.termRatio <= this.rho,
        () => this.variables[4].cost + l10(this.c3Ratio) < this.rho,
        true,
      ], //t1SolarXLII
    ];
    conditions = conditions.map((elem) => elem.map((i) => (typeof i === "function" ? i : () => i)));
    return conditions;
  }
  getMilestoneConditions() {
    let conditions: Array<Function> = [() => true, () => true, () => true, () => true, () => this.milestones[2] > 0, () => this.milestones[3] > 0];
    return conditions;
  }
  getMilestoneTree() {
    let tree: Array<Array<Array<number>>> = [
      ...new Array(5).fill([
        [0, 0, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [1, 2, 1, 1],
        [1, 3, 1, 1],
      ]), //t1,t1C34,t1C4,t1Ratio,t1SolarXLII
    ];
    return tree;
  }
  getTotMult(val: number) {
    return Math.max(0, val * 0.164 - l10(3)) + l10((this.sigma / 20) ** (this.sigma < 65 ? 0 : this.sigma < 75 ? 1 : this.sigma < 85 ? 2 : 3));
  }
  updateMilestones(): void {
    const stage = Math.min(6, Math.floor(Math.max(this.lastPub, this.maxRho) / 25));
    this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
  }
  constructor(data: theoryData) {
    this.stratIndex = findIndex(data.strats, data.strat);
    this.strat = data.strat;
    this.theory = "T1";
    //theory
    this.cap = typeof data.cap === "number" && data.cap > 0 ? [data.cap, 1] : [Infinity, 0];
    this.recovery = data.recovery ?? { value: 0, time: 0, recoveryTime: false };
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
      new Variable({ lvl: 1, cost: 5, costInc: 2, value: 1, stepwisePowerSum: { default: true } }),
      new Variable({ cost: 100, costInc: 10, varBase: 2 }),
      new Variable({ cost: 15, costInc: 2, stepwisePowerSum: { default: true } }),
      new Variable({ cost: 3000, costInc: 10, varBase: 2 }),
      new Variable({ cost: 1e4, costInc: 2 ** (4.5 * Math.log2(10)), varBase: 10 }),
      new Variable({ cost: 1e10, costInc: 2 ** (8 * Math.log2(10)), varBase: 10 }),
    ];
    //values of the different terms, so they are accesible for variable buying conditions
    this.term1 = 0;
    this.term2 = 0;
    this.term3 = 0;
    this.termRatio = 0;
    this.c3Ratio = this.lastPub < 300 ? 1 : this.lastPub < 450 ? 1.1 : this.lastPub < 550 ? 2 : this.lastPub < 655 ? 5 : 10;
    //pub values
    this.tauH = 0;
    this.maxTauH = 0;
    this.pubT = 0;
    this.pubRho = 0;
    //milestones  [logterm, c1exp, c3term, c4term]
    this.milestones = [0, 0, 0, 0];
    this.result = [];
    this.pubMulti = 0;
    this.conditions = this.getBuyingConditions();
    this.milestoneConditions = this.getMilestoneConditions();
    this.milestoneTree = this.getMilestoneTree();
    this.updateMilestones();
  }
  async simulate() {
    let c4_nc = Math.ceil((this.lastPub - 10) / 8) * 8 + 10;
    let pub = c4_nc - this.lastPub < 3 ? c4_nc + 2 : c4_nc - this.lastPub < 5 ? c4_nc - 2 + Math.log10(1.5) : c4_nc - 4 + Math.log10(1.4);
    let coast = (c4_nc - this.lastPub < 3 ? c4_nc : Math.floor(this.lastPub)) + Math.log10(30);
    coast = Math.max(8 + Math.log10(30), coast + Math.floor(pub - coast));
    let pubCondition = false;
    while (!pubCondition) {
      if (!global.simulating) break;
      if ((this.ticks + 1) % 500000 === 0) await sleep();
      this.tick();
      if (this.rho > this.maxRho) this.maxRho = this.rho;
      if (this.lastPub < 176) this.updateMilestones();
      this.curMult = 10 ** (this.getTotMult(this.maxRho) - this.totMult);
      if ((this.stratIndex !== 4 || this.rho < coast) || global.pubTimeCap !== Infinity) this.buyVariables();
      pubCondition = (global.pubTimeCap !== Infinity ? this.t > global.pubTimeCap : this.stratIndex === 4 ? this.pubRho > pub : this.t > this.pubT * 2 || this.pubRho > this.cap[0]) && this.maxRho > 10;
      this.ticks++;
    }
    this.pubMulti = 10 ** (this.getTotMult(this.pubRho) - this.totMult);
    this.result = createResult(this,global.pubTimeCap === Infinity && this.stratIndex === 4 ? ` ${this.lastPub < 50 ? "" : logToExp(Math.min(this.pubRho, coast), 2)}` : "");
    console.log(this);
    return this.result; 
  }
  tick() {
    this.term1 = this.variables[2].value * (1 + 0.05 * this.milestones[1]) + this.variables[3].value + (this.milestones[0] > 0 ? l10(1 + this.rho / Math.LOG10E / 100) : 0);
    this.term2 = add(this.variables[4].value + this.rho * 0.2, this.variables[5].value + this.rho * 0.3);
    this.term3 = this.variables[0].value + this.variables[1].value;

    let rhodot = add(this.term1, this.term2) + this.term3 + this.totMult + l10(this.dt);
    this.rho = add(this.rho, rhodot);

    this.t += this.dt / 1.5;
    this.dt *= this.ddt;
    if (this.maxRho < this.recovery.value) this.recovery.time = this.t;

    this.tauH = (this.maxRho - this.lastPub) / (this.t / 3600);
    if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < 10 || global.pubTimeCap !== Infinity || this.stratIndex === 4) {
      this.maxTauH = this.tauH;
      this.pubT = this.t;
      this.pubRho = this.maxRho;
    }
  }
  buyVariables() {
    let bought = false;
    for (let i = this.variables.length - 1; i >= 0; i--)
      while (true) {
        if (this.rho > this.variables[i].cost && (<Function>this.conditions[this.stratIndex][i])() && this.milestoneConditions[i]()) {
          this.rho = subtract(this.rho, this.variables[i].cost);
          this.variables[i].buy();
          bought = true;
        } else break;
      }
    if (bought) {
      this.termRatio = Math.max(l10(5), (this.term2 - this.term1) * Number(this.milestones[3] > 0));
    }
  }
}
