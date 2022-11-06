import { global } from "../Sim/main.js";
import { simResult, theoryData } from "../Utils/simHelpers.js";
import { add, arr, createResult, l10, subtract } from "../Utils/simHelpers.js";
import { findIndex, sleep } from "../Utils/helperFunctions.js";
import { variableInterface } from "../Utils/simHelpers.js";
import Variable from "../Utils/variable.js";

export default async function t4(data: theoryData): Promise<simResult> {
  let sim = new t4Sim(data);
  let res = await sim.simulate(data);
  return res;
}

class t4Sim {
  conditions: Array<Array<Function>>;
  milestoneConditions: Array<Function>;
  milestoneTree: Array<Array<Array<number>>>;

  stratIndex: number;
  strat: string;
  theory: string;
  //theory
  cap: Array<number>;
  recovery: { value: number; time: number; recoveryTime: boolean };
  recursionValue: null | number;
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
  q: number;
  //initialize variables
  variables: Array<variableInterface>;
  variableSum: number;
  // minCost
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
    let conditions: Array<Array<Function>> = [
      [...arr(8, true)], //t4
      [true, true, ...arr(6, false)], //t4c12
      [false, false, true, ...arr(3, false), true, true], //t4c3
      [...arr(3, false), true, false, false, true, true], //t4c4
      [...arr(4, false), true, false, true, true], //t4c5
      [...arr(4, false), true, true, true, true], //t4c56
      [() => this.variables[0].cost + 1 < this.variables[1].cost, true, false, false, false, false, false, false], //t4c12d
      [() => this.variables[0].cost + 1 < Math.min(this.variables[1].cost), true, true, false, false, false, () => this.variables[6].cost + 1 < this.variables[7].cost, true], //t4c123d
      [() => this.variables[0].cost + 1 < this.variables[1].cost && this.maxRho < this.lastPub, () => this.maxRho < this.lastPub, false, true, true, true, true, true], //T4C456dC12rcvMS
      [() => this.variables[0].cost + 1 < this.variables[1].cost && this.maxRho < this.lastPub, () => this.maxRho < this.lastPub, true, false, true, true, true, true], //T4C356dC12rcv
      [...arr(4, false), true, true, () => this.variables[6].cost + 1 < this.variables[7].cost, true], //t4c56d
      [
        false,
        false,
        () => this.variables[2].cost + 0.1 < (this.recursionValue ?? Infinity),
        ...arr(3, false),
        () =>
          this.variables[6].cost + l10(10 + (this.variables[6].lvl % 10)) <= Math.min(this.variables[7].cost, this.variables[2].cost) &&
          this.variables[6].cost + l10(10 + (this.variables[6].lvl % 10)) + 1 < (this.recursionValue ?? Infinity),
        () => this.variables[7].cost + 0.5 < (this.recursionValue ?? Infinity) && (this.curMult < 1 || this.variables[7].cost + l10(1.5) <= this.variables[2].cost)
      ] //t4c3d66
    ];
    conditions = conditions.map((elem) => elem.map((i) => (typeof i === "function" ? i : () => i)));
    return conditions;
  }
  getMilestoneConditions() {
    let conditions: Array<Function> = [() => true, () => true, () => true, () => this.milestones[0] > 0, () => this.milestones[0] > 1, () => this.milestones[0] > 2, () => true, () => true];
    return conditions;
  }
  getMilestoneTree() {
    let tree: Array<Array<Array<number>>> = [
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
        [3, 0, 1],
        [3, 0, 2],
        [3, 0, 3],
        [3, 1, 3]
      ], //t4

      [
        [0, 0, 0],
        [0, 1, 0]
      ], //t4c12
      [
        [0, 0, 0],
        [0, 0, 1],
        [0, 0, 2],
        [0, 0, 3]
      ], //t4c3
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
        [1, 0, 2],
        [1, 0, 3]
      ], //t4c4
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [2, 0, 1],
        [2, 0, 2],
        [2, 0, 3]
      ], //t4c5
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
        [3, 0, 1],
        [3, 0, 2],
        [3, 0, 3],
        [3, 0, 3]
      ], //t4c56
      [
        [0, 0, 0],
        [0, 1, 0]
      ], //t4c12d
      [
        [0, 0, 0],
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 2],
        [0, 1, 3]
      ], //t4c123d
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
        [1, 0, 2],
        [1, 0, 3]
      ], //T4C456dC12rcvMS (this doesnt matter)
      [
        [0, 0, 0],
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 2],
        [0, 1, 3],
        [1, 1, 3],
        [2, 1, 3],
        [3, 1, 3]
      ], //T4C356dC12rcv
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
        [3, 0, 1],
        [3, 0, 2],
        [3, 0, 3],
        [3, 0, 3]
      ], //t4c56d
      [
        [0, 0, 0],
        [0, 0, 1],
        [0, 0, 2],
        [0, 0, 3]
      ] //t4c3d66
    ];
    return tree;
  }
  getTotMult(val: number) {
    return Math.max(0, val * 0.165 - l10(4)) + l10((this.sigma / 20) ** (this.sigma < 65 ? 0 : this.sigma < 75 ? 1 : this.sigma < 85 ? 2 : 3));
  }
  updateMilestones(): void {
    const stage = Math.min(7, Math.floor(Math.max(this.lastPub, this.maxRho) / 25));
    this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];

    if (this.stratIndex === 8) {
      const max = [3, 1, 3];
      this.milestones = [0, 0, 0];

      let priority;
      if (this.maxRho < this.lastPub) {
        priority = [2, 3, 1];
      } else if (this.t % 100 < 50) {
        priority = [3, 1, 2];
      } else {
        priority = [1, 3, 2];
      }

      let milestoneCount = stage;
      this.milestones = [0, 0, 0];
      for (let i = 0; i < priority.length; i++) {
        while (this.milestones[priority[i] - 1] < max[priority[i] - 1] && milestoneCount > 0) {
          this.milestones[priority[i] - 1]++;
          milestoneCount--;
        }
      }
    }
  }
  constructor(data: theoryData) {
    this.stratIndex = findIndex(data.strats, data.strat);
    this.strat = data.strat;
    this.theory = "T4";
    //theory
    this.cap = typeof data.cap === "number" && data.cap > 0 ? [data.cap, 2] : [Infinity, 0];
    this.recovery = data.recovery ?? { value: 0, time: 0, recoveryTime: false };
    this.recursionValue = data.recursionValue;
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
      new Variable({ lvl: 1, cost: 5, costInc: 1.305, value: 1, stepwisePowerSum: { default: true } }),
      new Variable({ cost: 20, costInc: 3.75, varBase: 2 }),
      new Variable({ cost: 2000, costInc: 2.468, varBase: 2 }),
      new Variable({ cost: 1e4, costInc: 4.85, varBase: 3 }),
      new Variable({ cost: 1e8, costInc: 12.5, varBase: 5 }),
      new Variable({ cost: 1e10, costInc: 58, varBase: 10 }),
      new Variable({ cost: 1e3, costInc: 100, stepwisePowerSum: { default: true } }),
      new Variable({ cost: 1e4, costInc: 1000, varBase: 2 })
    ];
    this.variableSum = 0;
    //pub values
    this.tauH = 0;
    this.maxTauH = 0;
    this.pubT = 0;
    this.pubRho = 0;
    //milestones  [terms, c1exp, multQdot]
    this.milestones = [0, 0, 0];
    this.result = [];
    this.pubMulti = 0;
    this.conditions = this.getBuyingConditions();
    this.milestoneConditions = this.getMilestoneConditions();
    this.milestoneTree = this.getMilestoneTree();
    this.updateMilestones();
  }
  async simulate(data: theoryData) {
    if (this.recursionValue == null && this.strat === "T4C3d66" && global.forcedPubTime === Infinity) {
      data.recursionValue = Number.MAX_VALUE;
      let auxSim = await new t4Sim(data).simulate(data);
      this.recursionValue = auxSim[9][0];
    }
    let pubCondition = false;
    while (!pubCondition) {
      if (!global.simulating) break;
      if ((this.ticks + 1) % 500000 === 0) await sleep();
      this.tick();
      if (this.rho > this.maxRho) this.maxRho = this.rho;
      if (this.lastPub < 176) this.updateMilestones();
      this.curMult = 10 ** (this.getTotMult(this.maxRho) - this.totMult);
      this.buyVariables();
      pubCondition = global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : (this.t > this.pubT * 2 || this.pubRho > this.cap[0]) && this.pubRho > 9;
      this.ticks++;
    }
    this.pubMulti = 10 ** (this.getTotMult(this.pubRho) - this.totMult);
    this.result = createResult(this, this.stratIndex === 11 ? ` q1:${this.variables[6].lvl} q2:${this.variables[7].lvl}` : "");
    return this.result;
  }
  tick() {
    let vq1 = this.variables[6].value;
    let vq2 = this.variables[7].value;

    let qdot = l10(2) * this.milestones[2] + vq1 + vq2 - add(0, this.q);
    this.q = add(this.q, qdot + l10(this.dt));

    let rhodot = this.totMult + this.variableSum;
    this.rho = add(this.rho, rhodot + l10(this.dt));

    this.t += this.dt / 1.5;
    this.dt *= this.stratIndex === 11 && this.recursionValue === Number.MAX_VALUE ? Math.min(1.3, this.ddt * 10) : this.ddt;
    if (this.maxRho < this.recovery.value) this.recovery.time = this.t;

    this.tauH = (this.maxRho - this.lastPub) / (this.t / 3600);
    if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < 9 || global.forcedPubTime !== Infinity) {
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
        } else break;
      }

    let vc1 = this.variables[0].value * (1 + 0.15 * this.milestones[1]);
    let vc2 = this.variables[1].value;
    this.variableSum = vc1 + vc2;
    if (this.variables[2].lvl > 0) this.variableSum = add(this.variableSum, this.variables[2].value + this.q);
    if (this.variables[3].lvl > 0) this.variableSum = add(this.variableSum, this.variables[3].value + this.q * 2);
    if (this.variables[4].lvl > 0) this.variableSum = add(this.variableSum, this.variables[4].value + this.q * 3);
    if (this.variables[5].lvl > 0) this.variableSum = add(this.variableSum, this.variables[5].value + this.q * 4);
  }
}
