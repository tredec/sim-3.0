import { global } from "../../Sim/main.js";
import { logToExp, simResult, theoryData } from "../../Utils/simHelpers.js";
import { add, createResult, l10, subtract } from "../../Utils/simHelpers.js";
import { findIndex, sleep } from "../../Utils/helperFunctions.js";
import Variable, { ExponentialCost } from "../../Utils/variable.js";
import { varBuys } from "../../UI/simEvents.js";

export default async function t3(data: theoryData): Promise<simResult> {
  let sim = new t3Sim(data);
  let res = await sim.simulate();
  return res;
}

class t3Sim {
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
  currencies: Array<number>;
  maxRho: number;
  //initialize variables
  variables: Array<Variable>;
  boughtVars: (
    | number
    | {
        variable: string;
        level: number;
        cost: number;
        timeStamp: number;
      }
  )[];
  //pub values
  tauH: number;
  maxTauH: number;
  pubT: number;
  pubRho: number;
  //milestones  [dimensions, b1exp, b2exp, b3exp]
  milestones: Array<number>;
  pubMulti: number;
  result: Array<any>;

  getBuyingConditions() {
    let conditions: Array<Array<boolean | Function>> = [
      new Array(12).fill(true), //t3
      [true, true, false, true, true, false, true, false, false, false, false, false], //T3C11C12C21
      [true, true, true, false, true, false, false, true, true, true, true, false], //T3noC11C13C21C33
      [true, true, true, true, true, false, true, true, true, true, false, false], //T3noC13C32C33
      [true, true, true, true, true, false, true, true, true, true, true, false], //T3noC13C33
      [false, true, true, false, true, false, false, true, true, false, true, false], //T3noP1C13C33
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
      ], //T3Snax
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
      ], //T3Snax2
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
      ], //T3C11C12C21d
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
      ], //T3noC11C13C21C33d
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
      ], //T3noC11C13C33d
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
      ], //T3noC13C32C33d
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
      ], //T3noC13C33d
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
      ], //T3Play
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
    let conditions: Array<Function> = [
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
    let tree: Array<Array<Array<number>>> = [
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
  getTotMult(val: number) {
    return Math.max(0, val * 0.147 + l10(3)) + l10((this.sigma / 20) ** (this.sigma < 65 ? 0 : this.sigma < 75 ? 1 : this.sigma < 85 ? 2 : 3));
  }
  updateMilestones(): void {
    const stage = Math.min(7, Math.floor(Math.max(this.lastPub, this.maxRho) / 25));
    this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
  }
  constructor(data: theoryData) {
    this.stratIndex = findIndex(data.strats, data.strat);
    this.strat = data.strat;
    this.theory = "T3";
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
    this.currencies = [0, 0, 0];
    this.maxRho = 0;
    //initialize variables
    this.variables = [
      new Variable({ cost: new ExponentialCost(10, 1.18099), stepwisePowerSum: { default: true }, firstFreeCost: true }), //b1
      new Variable({ cost: new ExponentialCost(10, 1.308), stepwisePowerSum: { default: true } }), //b2
      new Variable({ cost: new ExponentialCost(3000, 1.675), stepwisePowerSum: { default: true } }), //b3
      new Variable({ cost: new ExponentialCost(20, 6.3496), varBase: 2 }), //c11
      new Variable({ cost: new ExponentialCost(10, 2.74), varBase: 2 }), //c12
      new Variable({ cost: new ExponentialCost(1000, 1.965), varBase: 2 }), //c13
      new Variable({ cost: new ExponentialCost(500, 18.8343), varBase: 2 }), //c21
      new Variable({ cost: new ExponentialCost(1e5, 3.65), varBase: 2 }), //c22
      new Variable({ cost: new ExponentialCost(1e5, 2.27), varBase: 2 }), //c23
      new Variable({ cost: new ExponentialCost(1e4, 1248.27), varBase: 2 }), //c31
      new Variable({ cost: new ExponentialCost(1e3, 6.81744), varBase: 2 }), //c32
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
    this.result = [];
    this.pubMulti = 0;
    this.conditions = this.getBuyingConditions();
    this.milestoneConditions = this.getMilestoneConditions();
    this.milestoneTree = this.getMilestoneTree();
    this.updateMilestones();
  }
  async simulate() {
    let pubCondition = false;
    while (!pubCondition) {
      if (!global.simulating) break;
      if ((this.ticks + 1) % 500000 === 0) await sleep();
      this.tick();
      if (this.currencies[0] > this.maxRho) this.maxRho = this.currencies[0];
      if (this.lastPub < 175) this.updateMilestones();
      this.curMult = 10 ** (this.getTotMult(this.maxRho) - this.totMult);
      this.buyVariables();
      pubCondition = (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0]) && this.pubRho > 9;
      this.ticks++;
    }
    this.pubMulti = 10 ** (this.getTotMult(this.pubRho) - this.totMult);
    this.result = createResult(this, "");
    if (this.stratIndex === 14) {
      while ((<varBuys>this.boughtVars[this.boughtVars.length - 1]).timeStamp > this.pubT) this.boughtVars.pop();
      global.varBuy.push([this.result[7], this.boughtVars]);
    }
    return this.result;
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
    if (this.maxRho < this.recovery.value) this.recovery.time = this.t;

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
        if (this.currencies[currencyIndex] > this.variables[i].cost && (<Function>this.conditions[this.stratIndex][i])() && this.milestoneConditions[i]()) {
          if (this.maxRho + 5 > this.lastPub && this.stratIndex === 14) {
            let vars = ["b1", "b2", "b3", "c11", "c12", "c13", "c21", "c22", "c23", "c31", "c32", "c33"];
            this.boughtVars.push({ variable: vars[i], level: this.variables[i].lvl + 1, cost: this.variables[i].cost, timeStamp: this.t });
          }
          this.currencies[currencyIndex] = subtract(this.currencies[currencyIndex], this.variables[i].cost);
          this.variables[i].buy();
        } else break;
      }
    }
  }
}
