import { global } from "../../Sim/main.js";
import { logToExp, simResult, theoryData } from "../../Utils/simHelpers.js";
import { add, createResult, l10, subtract } from "../../Utils/simHelpers.js";
import { findIndex, sleep } from "../../Utils/helperFunctions.js";
import { variableInterface } from "../../Utils/simHelpers.js";
import Variable from "../../Utils/variable.js";
import { getTauFactor } from "../../Sim/Components/helpers.js";

export default async function csr2(data: theoryData): Promise<simResult> {
  let sim = new csr2Sim(data);
  let res = await sim.simulate(data);
  return res;
}

class csr2Sim {
  conditions: Array<Array<boolean | Function>>;
  milestoneConditions: Array<Function>;

  stratIndex: number;
  strat: string;
  theory: string;
  tauFactor: number;
  //theory
  cap: Array<number>;
  recovery: { value: number; time: number; recoveryTime: boolean };
  recursionValue: Array<number>;
  bestCoast: Array<number>;
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
  t_var: number;
  //initialize variables
  variables: Array<variableInterface>;
  updateError_flag: boolean;
  error: number;
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
      [true, true, true, true, true], //CSR2
      [
        () => this.variables[0].cost + l10(7 + (this.variables[0].lvl % 10)) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[4].cost),
        true,
        () => this.variables[2].cost + l10(15 + (this.variables[2].lvl % 10)) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[4].cost),
        true,
        true
      ], //CS2d
      [
        () => this.variables[0].cost + l10(7 + (this.variables[0].lvl % 10)) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[4].cost),
        () => this.variables[1].cost + l10(1.8) < this.variables[4].cost,
        () => this.variables[2].cost + l10(15 + (this.variables[2].lvl % 10)) < Math.min(this.variables[1].cost, this.variables[3].cost, this.variables[4].cost),
        () => this.variables[3].cost + l10(1.3) < this.variables[4].cost,
        true
      ] //CS2XL
    ];
    //CSR2 CSR2d CSR2L
    conditions = conditions.map((elem) => elem.map((i) => (typeof i === "function" ? i : () => i)));
    return conditions;
  }
  getMilestoneConditions() {
    let conditions: Array<Function> = [() => true, () => true, () => true, () => true, () => this.milestones[1] > 0];
    return conditions;
  }
  getTotMult(val: number) {
    return Math.max(0, val * this.tauFactor * 2.203 - l10(200));
  }
  updateMilestones(): void {
    let milestoneCount = 0;
    let points = [10, 45, 80, 115, 220, 500];
    for (let i = 0; i < points.length; i++) {
      if (Math.max(this.lastPub, this.maxRho) >= points[i]) milestoneCount = i + 1;
    }
    let priority = [2, 3, 1];
    if (this.lastPub < 500 && this.stratIndex === 2) {
      let msCond = 0;
      if (this.lastPub > 45) msCond = 4;
      if (this.lastPub > 80) msCond = 8;
      if (this.lastPub > 115) msCond = 20;
      if (this.lastPub > 220) msCond = 40;
      if (
        ((this.rho + l10(msCond * 0.5) > this.variables[3].cost || (this.rho + l10(msCond) > this.variables[4].cost && this.milestones[1] > 0) || (this.curMult > 1 && this.rho + l10(2) > this.variables[1].cost)) &&
          this.rho < Math.min(this.variables[3].cost, this.variables[4].cost)) ||
        this.t > this.recursionValue[0]
      ) {
        priority = [1, 2, 3];
      } else priority = [2, 3, 1];
    }
    this.milestones = [0, 0, 0];
    const max = [3, 1, 2];
    for (let i = 0; i < priority.length; i++) {
      while (this.milestones[priority[i] - 1] < max[priority[i] - 1] && milestoneCount > 0) {
        this.milestones[priority[i] - 1]++;
        milestoneCount--;
      }
    }
  }
  updateError(n: number) {
    if (n < 6) {
      let preComputed = [0, l10(2.060660172040101), l10(12.010407635829813), l10(70.00178562229294), l10(408.0003059755347), l10(2378.000049517553)];
      this.error = preComputed[n];
      return;
    }
    let root2 = Math.SQRT2;
    let vdn = ((-(root2 - 1)) ** n * (n % 2 ? -1 : 1) + (1 + root2) ** n) / 2 / root2;
    let vp = (root2 + 1) ** n * (n % 2 ? -1 : 1);
    this.error = l10(Math.abs(vdn)) + l10(Math.abs(vp));
  }
  searchCoast(rhodot: number) {
    if (this.curMult > 0.7) {
      let i = getCoastLen(this.lastPub);
      const maxMulti = ((this.totMult + Math.log10(4) + Math.log10(200)) / 2.203) * 10;
      if (this.lastPub < 500) {
        {
          let endRho = add(this.rho, rhodot + this.variables[0].value * (this.maxRho >= 10 ? (this.maxRho >= 45 ? (this.maxRho >= 80 ? 1.15 : 1.1) : 1.05) : 1) + Math.log10(i * 1.5));
          let endTauH = (Math.min(maxMulti, endRho) - this.lastPub) / ((this.t + i) / 3600);
          if (this.bestCoast[0] < endTauH) {
            this.bestCoast[0] = endTauH;
            this.bestCoast[1] = this.t;
          }
        }
        i = i * 0.8;
        {
          let endRho = add(this.rho, rhodot + this.variables[0].value * (this.maxRho >= 10 ? (this.maxRho >= 45 ? (this.maxRho >= 80 ? 1.15 : 1.1) : 1.05) : 1) + Math.log10(i * 1.5));
          let endTauH = (Math.min(maxMulti, endRho) - this.lastPub) / ((this.t + i) / 3600);
          if (this.bestCoast[0] < endTauH) {
            this.bestCoast[0] = endTauH;
            this.bestCoast[1] = this.t;
          }
        }
        i = i / 0.8 ** 2;
        {
          let endRho = add(this.rho, rhodot + this.variables[0].value * (this.maxRho >= 10 ? (this.maxRho >= 45 ? (this.maxRho >= 80 ? 1.15 : 1.1) : 1.05) : 1) + Math.log10(i * 1.5));
          let endTauH = (Math.min(maxMulti, endRho) - this.lastPub) / ((this.t + i) / 3600);
          if (this.bestCoast[0] < endTauH) {
            this.bestCoast[0] = endTauH;
            this.bestCoast[1] = this.t;
          }
        }
      } else {
        rhodot = this.totMult + this.variables[0].value * (1 + 0.05 * this.milestones[0]) + this.variables[1].value + this.q;
        let qdot = this.totMult + this.variables[2].value + this.variables[4].value * 1.15 + this.error;
        let avgQ = add(this.q + l10(2), qdot + Math.log10(i * 1.5)) - l10(2);
        let endRho = add(this.rho, rhodot - this.q + avgQ + Math.log10(i * 1.5));
        let endTauH = (endRho - this.lastPub) / ((this.t + i) / 3600);
        if (this.bestCoast[0] < endTauH && endRho < maxMulti) {
          this.bestCoast[0] = endTauH;
          this.bestCoast[1] = this.t;
        }
      }
    }
  }
  constructor(data: theoryData) {
    this.stratIndex = findIndex(data.strats, data.strat);
    this.strat = data.strat;
    this.theory = "CSR2";
    this.tauFactor = getTauFactor(this.theory);
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
    this.t_var = 0;
    //initialize variables
    this.variables = [
      new Variable({ cost: 10, costInc: 5, stepwisePowerSum: { default: true }, firstFreeCost: true }),
      new Variable({ cost: 15, costInc: 128, varBase: 2 }),
      new Variable({ cost: 1e6, costInc: 16, value: 1, stepwisePowerSum: { default: true } }),
      new Variable({ cost: 50, costInc: 2 ** (Math.log2(256) * 3.346) }),
      new Variable({ cost: 1e3, costInc: 10 ** 5.65, varBase: 2 })
    ];
    this.recursionValue = <Array<number>>data.recursionValue ?? [Infinity, 0];
    this.bestCoast = [0, 0];
    this.updateError_flag = true;
    this.error = 0;
    //pub values
    this.tauH = 0;
    this.maxTauH = 0;
    this.pubT = 0;
    this.pubRho = 0;
    //milestones  [q1exp, c2term,c2exp]
    this.milestones = [0, 0, 0];
    this.result = [];
    this.pubMulti = 0;
    this.conditions = this.getBuyingConditions();
    this.milestoneConditions = this.getMilestoneConditions();
    this.updateMilestones();
  }
  async simulate(data: theoryData) {
    if (this.lastPub >= 10 && data.recursionValue == null && this.stratIndex === 2) {
      data.recursionValue = [Infinity, 0];
      let sim = new csr2Sim(data);
      let res = await sim.simulate(data);
      this.recursionValue = [sim.bestCoast[1], 1];
    }
    let pubCondition = false;
    while (!pubCondition) {
      if (!global.simulating) break;
      if ((this.ticks + 1) % 500000 === 0) await sleep();
      this.tick();
      if (this.rho > this.maxRho) this.maxRho = this.rho;
      this.curMult = 10 ** (this.getTotMult(this.maxRho) - this.totMult);
      if ((this.recursionValue != null && this.t < this.recursionValue[0]) || this.curMult < 0.7 || this.recursionValue[1] === 0) this.buyVariables();
      if (this.lastPub < 500) this.updateMilestones();
      pubCondition = (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0]) && this.pubRho > 10;
      this.ticks++;
    }
    this.pubMulti = 10 ** (this.getTotMult(this.pubRho) - this.totMult);
    let lastBuy = 0;
    for (let i = 0; i < this.variables.length; i++) {
      lastBuy = Math.max(lastBuy, this.variables[i].cost - this.variables[i].costInc);
    }
    this.result = createResult(this, this.stratIndex === 2 ? " " + Math.min(this.pubMulti, 10 ** (this.getTotMult(lastBuy) - this.totMult)).toFixed(2) : "");
    return this.result;
  }
  tick() {
    let vq1 = this.variables[0].value * (1 + 0.05 * this.milestones[0]);
    let vc2 = this.milestones[1] > 0 ? this.variables[4].value * (1 + 0.5 * this.milestones[2]) : 0;

    if (this.updateError_flag) {
      let c2level = this.milestones[1] > 0 ? this.variables[4].lvl : 0;
      let vn = this.variables[3].lvl + 1 + c2level;
      this.updateError(vn);
      this.updateError_flag = false;
    }

    if (this.lastPub < 500) this.searchCoast(this.totMult + this.variables[1].value + this.q);

    let qdot = this.variables[2].value + vc2 + this.error;
    this.q = add(this.q, this.totMult + l10(this.dt) + qdot);
    let rhodot = this.totMult + vq1 + this.variables[1].value + this.q;
    this.rho = add(this.rho, rhodot + l10(this.dt));

    this.t += this.dt / 1.5;
    this.dt *= this.ddt;
    if (this.maxRho < this.recovery.value) this.recovery.time = this.t;

    this.tauH = (this.maxRho - this.lastPub) / (this.t / 3600);
    if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < 10 || global.forcedPubTime !== Infinity) {
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
          if (i > 2) this.updateError_flag = true;
          bought = true;
        } else break;
      }
    if (bought) this.searchCoast(this.totMult + this.variables[1].value + this.q);
  }
}

function getCoastLen(r: number) {
  if (r < 45) return r ** 2.1 / 10;
  if (r < 80) return r ** 2.22 / 40;
  if (r < 220) return r ** 2.7 / 3.3e4 + 40;
  if (r < 500) return r ** 2.8 / 9.2e4 + 40;
  return 1.5 ** (r ** 0.8475 / 20) * 5;
}
