import { global } from "../../../Sim/main.js";
import { add, createResult, l10, subtract, sleep, binarySearch } from "../../../Utils/helpers.js";
import Variable, { ExponentialCost, StepwiseCost } from "../../../Utils/variable.js";
import { specificTheoryProps, theoryClass, conditionFunction } from "../../theory.js";
import { c1Exp, getBlackholeSpeed, getb, lookups, resolution, zeta } from "./RZhelpers.js";

export default async function rz(data: theoryData) {
  const sim = new rzSim(data);
  const res = await sim.simulate();
  return res;
}

type theory = "RZ";

class rzSim extends theoryClass<theory> implements specificTheoryProps {
  curMult: number;
  currencies: Array<number>;
  t_var: number;
  zTerm: number;
  rCoord: number;
  iCoord: number;
  offGrid: boolean;
  pubUnlock: number;

  getBuyingConditions() {
    const activeStrat = [
      () => this.variables[0].level < this.variables[1].level * 4 + (this.milestones[0] ? 2 : 1),
      true,
      true,
      () => (this.milestones[2] ? this.variables[3].cost + l10(4 + 0.5 * (this.variables[3].level % 8) + 0.0001) < this.variables[4].cost : true),
      true,
      true,
      true,
    ];
    const conditions: { [key in stratType[theory]]: Array<boolean | conditionFunction> } = {
      RZ: new Array(7).fill(true),
      RZd: activeStrat,
      RZdBH: activeStrat,
      RZSpiralswap: activeStrat,
      RZMS: activeStrat,
      RZnoB: [true, true, false, true, true, false, false],
    };
    const condition = conditions[this.strat].map((v) => (typeof v === "function" ? v : () => v));
    return condition;
  }
  getMilestoneConditions() {
    return [
      () => true,
      () => true,
      () => this.variables[2].level < 1,
      () => this.milestones[1] === 1,
      () => this.milestones[2] === 1,
      () => this.milestones[2] === 1,
      () => this.variables[6].level < 2,
    ];
  }
  getMilestoneTree() {
    const tree: { [key in stratType[theory]]: Array<Array<number>> } = {
      RZ: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 0],
        [2, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 0], // RZ (idle)
      ],
      RZd: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 0],
        [2, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 0], // RZd
      ],
      RZdBH: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 0],
        [2, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 1], // RZdBH
      ],
      RZSpiralswap: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [1, 1, 0, 0],
        [2, 1, 0, 0],
        [3, 1, 0, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 1], // Dummy line
      ],
      RZMS: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 0],
        [2, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 1], // Dummy line
      ],
      RZnoB: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 0],
        [2, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 0], // RZnob
      ],
    };
    return tree[this.strat];
  }
  getTotMult(val: number) {
    return Math.max(0, val * this.tauFactor * 2.102 + l10(2));
  }
  updateMilestones() {
    const points = [0, 25, 50, 125, 250, 400, 600];
    const stage = binarySearch(points, Math.max(this.lastPub, this.maxRho));
    const max = [3, 1, 1, 1];
    const originPriority = [2, 1, 3];
    const peripheryPriority = [2, 3, 1];
    if (this.strat === "RZSpiralswap") {
      // RZSS
      if (stage <= 1 || stage === 5) {
        this.milestones = this.milestoneTree[Math.min(this.milestoneTree.length - 1, stage)];
      } else if (stage <= 4) {
        // Spiralswap
        let priority = originPriority;
        if (this.zTerm > 1) priority = peripheryPriority;
        let milestoneCount = stage;
        this.milestones = [0, 0, 0, 0];
        for (let i = 0; i < priority.length; i++) {
          while (this.milestones[priority[i] - 1] < max[priority[i] - 1] && milestoneCount > 0) {
            this.milestones[priority[i] - 1]++;
            milestoneCount--;
          }
        }
      } else {
        // Black hole coasting
        if (this.maxRho < this.lastPub) this.milestones = this.milestoneTree[Math.min(this.milestoneTree.length - 1, stage)];
        else this.milestones = this.milestoneTree[stage + 1];
      }
    } else if (this.strat === "RZMS") {
      // RZMS
      if (stage <= 1 || stage === 5) {
        this.milestones = this.milestoneTree[Math.min(this.milestoneTree.length - 1, stage)];
      } else if (stage <= 4) {
        let priority = peripheryPriority;
        if (this.maxRho > this.lastPub) priority = originPriority;
        let milestoneCount = stage;
        this.milestones = [0, 0, 0, 0];
        for (let i = 0; i < priority.length; i++) {
          while (this.milestones[priority[i] - 1] < max[priority[i] - 1] && milestoneCount > 0) {
            this.milestones[priority[i] - 1]++;
            milestoneCount--;
          }
        }
      } else {
        // Black hole coasting
        if (this.maxRho < this.lastPub) this.milestones = this.milestoneTree[Math.min(this.milestoneTree.length - 1, stage)];
        else this.milestones = this.milestoneTree[stage + 1];
      }
    } else this.milestones = this.milestoneTree[Math.min(this.milestoneTree.length - 1, stage)];
  }
  constructor(data: theoryData) {
    super(data);
    this.totMult = this.getTotMult(data.rho);
    this.curMult = 0;
    this.currencies = [0, 0];
    this.t_var = 0;
    this.zTerm = 0;
    this.rCoord = -1.4603545088095868;
    this.iCoord = 0;
    this.offGrid = false;
    this.varNames = ["c1", "c2", "b", "w1", "w2", "w3", "b+"];
    this.variables = [
      new Variable({
        firstFreeCost: true,
        cost: new ExponentialCost(225, Math.pow(2, 0.699)),
        stepwisePowerSum: {
          base: 2,
          length: 8,
        },
      }),
      new Variable({
        cost: new ExponentialCost(1500, Math.pow(2, 0.699 * 4)),
        varBase: 2,
      }),
      new Variable({
        cost: new ExponentialCost(1e21, 1e79),
        // power: use outside method
      }),
      new Variable({
        cost: new StepwiseCost(6, new ExponentialCost(120000, Math.pow(100, 1 / 3))),
        value: 1,
        stepwisePowerSum: {
          base: 2,
          length: 8,
        },
      }),
      new Variable({
        cost: new ExponentialCost(1e5, 10),
        varBase: 2,
      }),
      new Variable({
        cost: new ExponentialCost("3.16227766017e599", 1e30),
        varBase: 2,
      }),
      new Variable({
        cost: new ExponentialCost("1e600", "1e300"),
        // b (2nd layer)
      }),
    ];
    this.pubUnlock = 9;
    this.conditions = this.getBuyingConditions();
    this.milestoneConditions = this.getMilestoneConditions();
    this.milestoneTree = this.getMilestoneTree();
    this.updateMilestones();
    // this.output = document.querySelector(".varOutput");
    // this.outputResults = "time,t,rho,delta<br>";
  }
  async simulate() {
    let pubCondition = false;
    while (!pubCondition) {
      if (!global.simulating) break;
      // Prevent lookup table from retrieving values from wrong sim settings
      if (!this.ticks && (this.dt !== lookups.prevDt || this.ddt !== lookups.prevDdt)) {
        lookups.prevDt = this.dt;
        lookups.prevDdt = this.ddt;
        lookups.zetaLookup = [];
        lookups.zetaDerivLookup = [];
      }
      if ((this.ticks + 1) % 500000 === 0) await sleep();
      this.tick();
      if (this.currencies[0] > this.maxRho) this.maxRho = this.currencies[0];
      // Eternal milestone swapping
      this.updateMilestones();
      this.curMult = Math.pow(10, this.getTotMult(this.maxRho) - this.totMult);
      this.buyVariables();
      pubCondition = (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0] || this.curMult > 30) && this.pubRho > this.pubUnlock;
      this.ticks++;
    }
    // Printing
    // this.output.innerHTML = this.outputResults;
    // this.outputResults = '';
    this.pubMulti = Math.pow(10, this.getTotMult(this.pubRho) - this.totMult);
    const result = createResult(this, "");
    while (this.boughtVars[this.boughtVars.length - 1].timeStamp > this.pubT) this.boughtVars.pop();
    global.varBuy.push([result[7], this.boughtVars]);
    return result;
  }
  tick() {
    let t_dot: number;
    if (this.milestones[3]) {
      t_dot = getBlackholeSpeed(this.zTerm);
      this.offGrid = true;
    } else t_dot = 1 / resolution;
    this.t_var += (this.dt * t_dot) / 1.5;
    const tTerm = l10(this.t_var);
    const bonus = l10(this.dt) + this.totMult;
    const w1Term = this.milestones[1] ? this.variables[3].value : 0;
    const w2Term = this.milestones[2] ? this.variables[4].value : 0;
    const w3Term = this.milestones[2] ? this.variables[5].value : 0;
    const c1Term = this.variables[0].value * c1Exp[this.milestones[0]];
    const c2Term = this.variables[1].value;
    const bTerm = getb(this.variables[2].level + this.variables[6].level);
    const z = zeta(this.t_var, this.ticks, this.offGrid, lookups.zetaLookup);
    if (this.milestones[1]) {
      const tmpZ = zeta(this.t_var + 0.0001, this.ticks, this.offGrid, lookups.zetaDerivLookup);
      const dr = tmpZ[0] - z[0];
      const di = tmpZ[1] - z[1];
      const derivTerm = l10(Math.sqrt(dr * dr + di * di)) + 4;
      this.currencies[1] = add(this.currencies[1], derivTerm + l10(Math.pow(2, bTerm)) + w1Term + w2Term + w3Term + bonus);
    }
    this.rCoord = z[0];
    this.iCoord = z[1];
    this.zTerm = Math.abs(z[2]);
    this.currencies[0] = add(this.currencies[0], tTerm + c1Term + c2Term + w1Term + bonus - l10(this.zTerm / bTerm + 0.01));
    this.t += this.dt / 1.5;
    this.dt *= this.ddt;
    if (this.maxRho < this.recovery.value) this.recovery.time = this.t;
    this.tauH = (this.maxRho - this.lastPub) / (this.t / 3600);
    if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < this.pubUnlock || global.forcedPubTime !== Infinity) {
      this.maxTauH = this.tauH;
      this.pubT = this.t;
      this.pubRho = this.maxRho;
    }
    // this.outputResults += `${this.t},${this.t_var},${this.currencies[0]},${this.currencies[1]}<br>`;
  }
  buyVariables() {
    const currencyIndices = [0, 0, 0, 1, 1, 1, 0];
    for (let i = this.variables.length - 1; i >= 0; i--)
      while (true) {
        if (this.currencies[currencyIndices[i]] > this.variables[i].cost && this.conditions[i]() && this.milestoneConditions[i]()) {
          this.currencies[currencyIndices[i]] = subtract(this.currencies[currencyIndices[i]], this.variables[i].cost);
          if (this.maxRho + 5 > this.lastPub) {
            this.boughtVars.push({
              variable: this.varNames[i],
              level: this.variables[i].level + 1,
              cost: this.variables[i].cost,
              timeStamp: this.t,
            });
          }
          this.variables[i].buy();
        } else break;
      }
  }
}
