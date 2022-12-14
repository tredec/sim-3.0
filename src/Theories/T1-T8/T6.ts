import { global } from "../../Sim/main.js";
import { logToExp, simResult, theoryData } from "../../Utils/simHelpers.js";
import { add, createResult, l10, subtract } from "../../Utils/simHelpers.js";
import { findIndex, sleep } from "../../Utils/helperFunctions.js";
import { variableInterface } from "../../Utils/simHelpers.js";
import Variable from "../../Utils/variable.js";
import { varBuys } from "../../UI/simEvents.js";

export default async function t6(data: theoryData): Promise<simResult> {
  let sim = new t6Sim(data);
  let res = await sim.simulate();
  return res;
}

class t6Sim {
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
  q: number;
  r: number;
  //initialize variables
  variables: Array<variableInterface>;
  k: number;
  stopC12: Array<number | boolean>;
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
      [true, true, true, true, true, true, true, true, true], //T6
      [true, true, true, true, false, false, true, false, false], //T6C3
      [true, true, true, true, false, false, false, true, false], //T6C4
      [true, true, true, true, true, true, false, false, true], //T6noC34
      [true, true, true, true, true, true, false, false, false], //T6noC345
      [true, true, true, true, false, false, false, false, true], //T6noC1234
      [true, true, true, true, () => this.stopC12[2], () => this.stopC12[2], false, false, true], //T6snax
      [
        () => this.variables[0].cost + l10(3) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[6].cost),
        true,
        () => this.variables[2].cost + l10(3) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[6].cost),
        true,
        false,
        false,
        true,
        false,
        false
      ], //T6C3d
      [
        () => this.variables[0].cost + l10(5) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[7].cost),
        true,
        () => this.variables[2].cost + l10(5) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[7].cost),
        true,
        false,
        false,
        false,
        true,
        false
      ], //T6C4d
      [
        () => this.variables[0].cost + l10(8) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[5].cost, this.milestones[2] > 0 ? this.variables[8].cost : Infinity),
        true,
        () => this.variables[2].cost + l10(8) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[5].cost, this.milestones[2] > 0 ? this.variables[8].cost : Infinity),
        true,
        () => this.variables[4].cost + l10(8) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[5].cost, this.milestones[2] > 0 ? this.variables[8].cost : Infinity),
        true,
        false,
        false,
        true
      ], //T6C34d
      [
        () => this.variables[0].cost + l10(8) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[5].cost),
        true,
        () => this.variables[2].cost + l10(8) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[5].cost),
        true,
        () => this.variables[4].cost + l10(8) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[5].cost),
        true,
        false,
        false,
        false
      ], //T6C345d
      [
        () => this.variables[0].cost + l10(7 + (this.variables[0].lvl % 10)) < Math.min(this.variables[1].cost, this.variables[3].cost, this.milestones[2] > 0 ? this.variables[8].cost : Infinity),
        true,
        () => this.variables[2].cost + l10(5) < Math.min(this.variables[1].cost, this.variables[3].cost, this.milestones[2] > 0 ? this.variables[8].cost : Infinity),
        true,
        false,
        false,
        false,
        false,
        true
      ], //T6C1234d
      [false] //T6AI has own buying system
    ];
    conditions = conditions.map((elem) => elem.map((i) => (typeof i === "function" ? i : () => i)));
    return conditions;
  }
  getMilestoneConditions() {
    let conditions: Array<Function> = [() => true, () => true, () => this.milestones[0] > 0, () => this.milestones[0] > 0, () => true, () => true, () => true, () => true, () => this.milestones[2] > 0];
    return conditions;
  }
  getMilestoneTree() {
    let tree: Array<Array<Array<number>>> = [
      ...new Array(13).fill([
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [1, 1, 0, 0],
        [1, 1, 1, 0],
        [1, 0, 0, 3],
        [1, 0, 1, 3],
        [1, 1, 1, 3]
      ])
    ];
    return tree;
  }

  getTotMult(val: number) {
    return Math.max(0, val * 0.196) - l10(50) + l10((this.sigma / 20) ** (this.sigma < 65 ? 0 : this.sigma < 75 ? 1 : this.sigma < 85 ? 2 : 3));
  }
  updateMilestones(): void {
    const stage = Math.min(6, Math.floor(Math.max(this.lastPub, this.maxRho) / 25));
    this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
  }
  calculateIntegral(vc1: number, vc2: number, vc3: number, vc4: number, vc5: number) {
    let term1 = vc1 + vc2 + this.q + this.r;
    let term2 = vc3 + this.q * 2 + this.r - l10(2);
    let term3 = this.milestones[1] > 0 ? vc4 + this.q * 3 + this.r - l10(3) : 0;
    let term4 = this.milestones[2] > 0 ? vc5 + this.q + this.r * 2 - l10(2) : 0;
    this.k = term4 - term1;
    return this.totMult + add(term1, add(term2, add(term3, term4)));
  }
  constructor(data: theoryData) {
    this.stratIndex = findIndex(data.strats, data.strat);
    this.strat = data.strat;
    this.theory = "T6";
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
    this.q = 0;
    this.r = 0;
    //initialize variables
    this.variables = [
      new Variable({ lvl: 1, cost: 15, costInc: 3, value: 1, stepwisePowerSum: { default: true } }),
      new Variable({ cost: 500, costInc: 100, varBase: 2 }),
      new Variable({ cost: 1e25, costInc: 1e5, stepwisePowerSum: { default: true } }),
      new Variable({ cost: 1e30, costInc: 1e10, varBase: 2 }),
      new Variable({ cost: 10, costInc: 2, value: 1, stepwisePowerSum: { default: true } }),
      new Variable({ cost: 100, costInc: 5, varBase: 2 }),
      new Variable({ cost: 1e7, costInc: 1.255, stepwisePowerSum: { default: true } }),
      new Variable({ cost: 1e25, costInc: 5e5, varBase: 2 }),
      new Variable({ cost: 15, costInc: 3.9, varBase: 2 })
    ];
    this.k = 0;
    this.stopC12 = [0, 0, true];
    this.boughtVars = [];
    //pub values
    this.tauH = 0;
    this.maxTauH = 0;
    this.pubT = 0;
    this.pubRho = 0;
    //milestones  [q1exp,c3term,c3exp]
    this.milestones = [0, 0, 0];
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
      if (this.rho > this.maxRho) this.maxRho = this.rho;
      if (this.lastPub < 150) this.updateMilestones();
      this.curMult = 10 ** (this.getTotMult(this.maxRho) - this.totMult);
      this.buyVariables();
      pubCondition = (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0]) && this.pubRho > 12;
      this.ticks++;
    }
    this.pubMulti = 10 ** (this.getTotMult(this.pubRho) - this.totMult);
    this.result = createResult(this, this.strat === "T6snax" ? " " + logToExp(<number>this.stopC12[0], 1) : "");
    if (this.stratIndex === 12) {
      while ((<varBuys>this.boughtVars[this.boughtVars.length - 1]).timeStamp > this.pubT) this.boughtVars.pop();
      global.varBuy.push([this.result[7], this.boughtVars]);
    }
    return this.result;
  }
  tick() {
    let vc1 = this.variables[4].value * (1 + 0.05 * this.milestones[3]);

    let C = subtract(this.calculateIntegral(vc1, this.variables[5].value, this.variables[6].value, this.variables[7].value, this.variables[8].value), this.rho);

    this.q = add(this.q, this.variables[0].value + this.variables[1].value + l10(this.dt));

    this.r = this.milestones[0] > 0 ? add(this.r, this.variables[2].value + this.variables[3].value + l10(this.dt) - 3) : 0;

    let newCurrency = this.calculateIntegral(vc1, this.variables[5].value, this.variables[6].value, this.variables[7].value, this.variables[8].value);
    C = C > newCurrency ? newCurrency : C;
    this.rho = Math.max(0, subtract(newCurrency, C));

    if (this.k > 0.3) (<number>this.stopC12[1])++;
    else this.stopC12[1] = 0;

    if (this.stopC12[1] > 30 && this.stopC12[2]) {
      this.stopC12[0] = this.maxRho;
      this.stopC12[2] = false;
    }

    this.t += this.dt / 1.5;
    this.dt *= this.ddt;
    if (this.maxRho < this.recovery.value) this.recovery.time = this.t;

    this.tauH = (this.maxRho - this.lastPub) / (this.t / 3600);
    if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < 12 || global.forcedPubTime !== Infinity) {
      this.maxTauH = this.tauH;
      this.pubT = this.t;
      this.pubRho = this.maxRho;
    }
  }
  buyVariables() {
    if (this.stratIndex !== 12)
      for (let i = this.variables.length - 1; i >= 0; i--)
        while (true) {
          if (this.rho > this.variables[i].cost && (<Function>this.conditions[this.stratIndex][i])() && this.milestoneConditions[i]()) {
            this.rho = subtract(this.rho, this.variables[i].cost);
            this.variables[i].buy();
          } else break;
        }
    else {
      while (true) {
        let rawCost = this.variables.map((item) => item.cost);
        let weights = [
          l10(7 + (this.variables[0].lvl % 10)), //q1
          0, //q2
          l10(5 + (this.variables[2].lvl % 10)), //r1
          0, //r2
          Math.max(0, this.k) + l10(8 + (this.variables[4].lvl % 10)), //c1
          Math.max(0, this.k), //c2
          Infinity, //c3
          Infinity, //c4
          -Math.min(0, this.k) //c5
        ];
        let minCost = [Number.MAX_VALUE, -1];
        for (let i = this.variables.length - 1; i >= 0; i--)
          if (rawCost[i] + weights[i] < minCost[0] && this.milestoneConditions[i]()) {
            minCost = [rawCost[i] + weights[i], i];
          }
        if (minCost[1] !== -1 && rawCost[minCost[1]] < this.rho) {
          this.rho = subtract(this.rho, this.variables[minCost[1]].cost);
          if (this.maxRho + 5 > this.lastPub) {
            let vars = ["q1", "q2", "r1", "r2", "c1", "c2", "c3", "c4", "c5"];
            this.boughtVars.push({ variable: vars[minCost[1]], level: this.variables[minCost[1]].lvl + 1, cost: this.variables[minCost[1]].cost, timeStamp: this.t });
          }
          this.variables[minCost[1]].buy();
        } else break;
      }
    }
  }
}
