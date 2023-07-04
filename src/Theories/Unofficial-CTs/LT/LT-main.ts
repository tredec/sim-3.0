import { global, varBuy, theory } from "../../../Sim/main.js";
import { add, createResult, l10, subtract, theoryData, sleep, binarySearch } from "../../../Utils/helpers.js";
import Variable, { ExponentialCost } from "../../../Utils/variable.js";
import jsonData from "../../../Data/data.json" assert { type: "json" };

export default async function lt(data: theoryData) {
  let sim = new ltSim(data);
  let res = await sim.simulate();
  return res;
}

type strat = keyof (typeof jsonData.theories)["LT-main"]["strats"];

class ltSim {
  conditions: Array<Function>;
  milestoneConditions: Array<Function>;
  milestoneTree: Array<Array<number>>;

  strat: strat;
  theory: theory;
  tauFactor: number;
  //theory
  cap: Array<number>;
  recovery: { value: number; time: number; recoveryTime: boolean };
  lastPub: number;
  sigma: number;
  totMult: number;
  curMult: number;
  pubUnlock: number;
  dt: number;
  ddt: number;
  t: number;
  ticks: number;
  timer: number;
  //currencies
  currencies: [number, number];
  maxRho: number;
  t_var: number;
  cycleTimes: { [key in strat]: [number, number] };
  s: number;
  laplaceActive: boolean;
  laplaceCounter: number;
  //initialize variables
  variables: Array<Variable>;
  boughtVars: Array<varBuy>;
  varNames: Array<string>;
  //pub values
  tauH: number;
  maxTauH: number;
  pubT: number;
  pubRho: number;
  //milestones  [dimensions, b1exp, b2exp, b3exp]
  milestones: Array<number>;
  pubMulti: number;

  constructor(data: theoryData) {
    this.strat = data.strat as strat;
    this.theory = "LT-main";
    this.tauFactor = jsonData.theories["LT-main"]["tauFactor"];
    this.cap = typeof data.cap === "number" && data.cap > 0 ? [data.cap, 1] : [Infinity, 0];
    this.recovery = data.recovery ?? { value: 0, time: 0, recoveryTime: false };
    this.lastPub = data.rho;
    this.sigma = data.sigma;
    this.totMult = this.getTotMult(data.rho);
    this.curMult = 0;
    this.pubUnlock = 7;
    this.dt = global.dt;
    this.ddt = global.ddt;
    this.t = 0;
    this.ticks = 0;
    this.timer = 0;
    this.currencies = [0, 0];
    this.cycleTimes = {
      "LT-main-30/30": [30 * 60, 30 * 60],
      "LT-main-2/2": [2 * 60, 2 * 60],
      "LT-main-2/240": [2 * 60, 240 * 60],
    };
    this.maxRho = 0;
    this.t_var = 0;
    this.s = l10((1 + 5 ** 0.5) / 2 - 1);
    this.laplaceActive = false;
    this.variables = [
      new Variable({
        cost: new ExponentialCost(10, 1.8),
        value: 1,
        stepwisePowerSum: { default: true },
      }),
      new Variable({
        cost: new ExponentialCost(750, 9),
        varBase: 2,
      }),
      new Variable({
        cost: new ExponentialCost(100, 15),
        varBase: 2,
      }),
      new Variable({
        firstFreeCost: true,
        cost: new ExponentialCost(4e2, 15),
        stepwisePowerSum: { default: true },
        // 0.05 multiplier can't go here
      }),
      new Variable({
        cost: new ExponentialCost(1e4, 24),
        varBase: Math.E,
        // 0.5 power can't go here
      }),
      new Variable({
        firstFreeCost: true,
        cost: new ExponentialCost(1e5, 3),
        stepwisePowerSum: { default: true },
      }),
      new Variable({
        cost: new ExponentialCost(1e7, 5e4),
        varBase: 5,
      }),
      new Variable({
        cost: new ExponentialCost(1e50, 1e40),
      }),
      new Variable({
        cost: new ExponentialCost("1e400", 1e10),
      }),
    ];
    this.varNames = ["c1", "c2", "c3", "t_dot", "c_s1", "c_s2", "lambda_s", "lambda_exp", "t_dot_exponent"];
    this.boughtVars = [];
    this.tauH = 0;
    this.maxTauH = 0;
    this.pubT = 0;
    this.pubRho = 0;
    this.laplaceCounter = 0;
    this.milestones = [0, 0, 0, 0];
    this.pubMulti = 0;
    this.conditions = this.getBuyingConditions();
    this.milestoneConditions = this.getMilestoneConditions();
    this.milestoneTree = this.getMilestoneTree();
    this.updateMilestones();
  }
  getBuyingConditions() {
    const conditions: { [key in strat]: Array<boolean | Function> } = {
      "LT-main-30/30": Array(this.variables.length).fill(true),
      "LT-main-2/2": [
        () => this.variables[0].cost + l10(5 + 0.5 * (this.variables[0].level % 10) + 0.0001) < Math.min(this.variables[1].cost, this.variables[2].cost),
        true,
        true,
        () => this.variables[3].cost + 1 + l10(5 + 0.5 * (this.variables[3].level % 10) + 0.0001) < Math.min(this.variables[1].cost, this.variables[2].cost),
        true,
        true,
        true,
        true,
      ],
      "LT-main-2/240": Array(this.variables.length).fill(true),
    };
    const condition = conditions[this.strat].map((v) => (typeof v === "function" ? v : () => v));
    return condition;
  }
  getMilestoneConditions() {
    return [
      () => this.laplaceActive == false,
      () => this.laplaceActive == false,
      () => this.laplaceActive == false,
      () => this.laplaceActive == false,
      () => this.laplaceActive == true,
      () => this.laplaceActive == true,
      () => this.laplaceActive == true && this.variables[6].level < 40,
      () => this.laplaceActive == true,
    ];
  }
  getMilestoneTree() {
    const globalOptimalRoute = [
      [0, 0, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 2, 0],
      [1, 0, 2, 0],
      [2, 0, 2, 0],
      [3, 0, 2, 0],
      [3, 1, 2, 0],
      [3, 2, 2, 0],
      [3, 3, 2, 0],
      [3, 4, 2, 0],
      [3, 4, 2, 1],
    ];
    const tree: { [key in strat]: Array<Array<number>> } = {
      "LT-main-30/30": globalOptimalRoute,
      "LT-main-2/2": globalOptimalRoute,
      "LT-main-2/240": globalOptimalRoute,
    };
    return tree[this.strat];
  }
  getTotMult(val: number) {
    return Math.max(0, val * this.tauFactor * 10 - l10(2));
  }
  updateMilestones() {
    const points = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
    let stage = binarySearch(points, Math.max(this.lastPub, this.maxRho));
    const max = [3, 4, 2, 1];
    const tPriority = [1, 2, 3, 4];
    const sPriority = [3, 2, 1, 4];
    if (this.strat === "LT-main-2/2") {
      let priority;
      let milestoneCount = stage;
      if (this.laplaceActive) priority = sPriority;
      else priority = tPriority;

      this.milestones = [0, 0, 0, 0];
      for (let i = 0; i < priority.length; i++) {
        while (this.milestones[priority[i] - 1] < max[priority[i] - 1] && milestoneCount > 0) {
          this.milestones[priority[i] - 1]++;
          milestoneCount--;
        }
      }
    } else {
      this.milestones = this.milestoneTree[Math.min(this.milestoneTree.length - 1, stage)];
    }
    if (this.variables[6].varBase !== 10 * 10 ** this.milestones[2]) {
      this.variables[6].varBase = 10 * 10 ** this.milestones[2];
      this.variables[6].reCalculate();
    }
  }
  async simulate() {
    let pubCondition = false;
    while (!pubCondition) {
      if (!global.simulating) break;
      if ((this.ticks + 1) % 500000 === 0) await sleep();
      this.tick();
      if (this.currencies[0] > this.maxRho) this.maxRho = this.currencies[0];
      this.updateMilestones();
      this.curMult = Math.pow(10, this.getTotMult(this.maxRho) - this.totMult);
      this.buyVariables();
      pubCondition =
        !this.laplaceActive &&
        this.laplaceCounter > 0 &&
        (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0]) &&
        this.pubRho > this.pubUnlock;
      this.ticks++;
    }
    this.pubMulti = Math.pow(10, this.getTotMult(this.pubRho) - this.totMult);
    const result = createResult(this, "");
    while (this.boughtVars[this.boughtVars.length - 1].timeStamp > this.pubT) this.boughtVars.pop();
    global.varBuy.push([result[7], this.boughtVars]);
    return result;
  }
  transform() {
    this.laplaceActive = !this.laplaceActive;
    this.laplaceCounter++;
  }
  getQS() {
    return this.variables[5].value * 2 + this.variables[4].value / 2 + this.s + add(this.s, 0);
  }
  tick() {
    let cap = this.laplaceActive ? this.cycleTimes[this.strat][1] : this.cycleTimes[this.strat][0];
    if (this.maxRho > 4 && this.timer >= cap) {
      this.timer = 0;
      this.transform();
    }
    let ldt = l10(this.dt);
    let bonus = this.totMult;
    if (this.laplaceActive) {
      if (this.variables[5].level > 0) {
        this.s = add(this.s, this.t_var);
        this.t_var = 0;
        this.currencies[1] = add(this.currencies[1], bonus * (0.1 + 0.1 * this.milestones[1]) + this.getQS() + ldt);
        1;
      }
    } else {
      this.t_var = add(this.t_var, this.variables[8].level * 1.01 * (this.variables[3].value + l10(0.05)) + ldt);
      let q = this.variables[2].value;
      if (this.t_var < 2) q += l10(1 - Math.exp(-Math.pow(10, this.t_var)));
      this.currencies[0] = add(
        this.currencies[0],
        bonus + this.variables[0].value * (1 + 0.05 * this.milestones[0]) + this.variables[1].value + this.variables[6].value * (1 + 0.1 * this.variables[7].level) + q + ldt
      );
    }
    this.timer += this.dt / 1.5;
    this.t += this.dt / 1.5;
    this.dt *= this.ddt;
    if (this.maxRho < this.recovery.value) this.recovery.time = this.t;
    this.tauH = (this.maxRho - this.lastPub) / (this.t / 3600);
    if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < this.lastPub || this.pubRho < this.pubUnlock || global.forcedPubTime !== Infinity) {
      this.maxTauH = this.tauH;
      this.pubT = this.t;
      this.pubRho = this.maxRho;
    }
  }
  buyVariables() {
    const currencyIndices = [0, 0, 0, 0, 1, 1, 1, 1, 0];
    for (let i = this.variables.length - 1; i >= 0; i--)
      while (true) {
        if (this.currencies[currencyIndices[i]] > this.variables[i].cost && this.conditions[i]() && this.milestoneConditions[i]()) {
          this.currencies[currencyIndices[i]] = subtract(this.currencies[currencyIndices[i]], this.variables[i].cost);
          if (this.maxRho + 5 > this.lastPub) {
            this.boughtVars.push({
              variable: this.varNames[i],
              level: this.variables[i].level + 1,
              cost: this.variables[i].cost,
              symbol: currencyIndices[i] === 0 ? "rho" : "lambda",
              timeStamp: this.t,
            });
          }
          this.variables[i].buy();
        } else break;
      }
  }
}
