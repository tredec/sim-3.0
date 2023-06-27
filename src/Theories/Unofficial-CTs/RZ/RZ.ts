import { global, varBuy, theory } from "../../../Sim/main.js";
import { add, createResult, l10, subtract, theoryData, sleep, binarySearch } from "../../../Utils/helpers.js";
import Variable, { ExponentialCost, StepwiseCost } from "../../../Utils/variable.js";
import jsonData from "../../../Data/data.json" assert { type: "json" };
import { c1Exp, getBlackholeSpeed, getb, lookups, resolution, zeta } from "./RZhelpers.js";

export default async function rz(data: theoryData) {
  let sim = new rzSim(data);
  let res = await sim.simulate();
  return res;
}

type strat = keyof typeof jsonData.theories.RZ.strats;

class rzSim {
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
  dt: number;
  ddt: number;
  t: number;
  ticks: number;
  //currencies
  currencies: Array<number>;
  maxRho: number;
  //things
  t_var: number;
  zTerm: number;
  rCoord: number;
  iCoord: number;
  offGrid: boolean;
  //initialize variables
  varNames: Array<string>;
  variables: Array<Variable>;
  boughtVars: Array<varBuy>;
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
    this.theory = "RZ";
    this.tauFactor = jsonData.theories.RZ.tauFactor;
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
    this.currencies = [0, 0];
    this.maxRho = 0;
    this.t_var = 0;
    this.zTerm = 0;
    this.rCoord = -1.4603545088095868;
    this.iCoord = 0;
    this.offGrid = false;
    this.variables = [
      new Variable({
        firstFreeCost: true,
        cost: new ExponentialCost(225, Math.pow(2, 0.699)),
        stepwisePowerSum: {
          base: 2,
          length: 8
        }
      }),
      new Variable({
        cost: new ExponentialCost(1500, Math.pow(2, 0.699 * 4)),
        varBase: 2
      }),
      new Variable({
        cost: new ExponentialCost(1e21, 1e79)
        // power: use outside method
      }),
      new Variable({
        cost: new StepwiseCost(6, new ExponentialCost(120000, Math.pow(100, 1 / 3))),
        value: 1,
        stepwisePowerSum: {
          base: 2,
          length: 8
        }
      }),
      new Variable({
        cost: new ExponentialCost(1e5, 10),
        varBase: 2
      }),
      new Variable({
        cost: new ExponentialCost("3.16227766017e599", 1e30),
        varBase: 2
      }),
      new Variable({
        cost: new ExponentialCost("1e600", "1e300")
        // b (2nd layer)
      })
    ];
    this.varNames = ["c1", "c2", "b", "w1", "w2", "w3", "b+"];
    this.boughtVars = [];
    this.tauH = 0;
    this.maxTauH = 0;
    this.pubT = 0;
    this.pubRho = 0;
    //c1exp delta w2term black-hole
    this.milestones = [0, 0, 0, 0];
    this.pubMulti = 0;
    this.conditions = this.getBuyingConditions();
    this.milestoneConditions = this.getMilestoneConditions();
    this.milestoneTree = this.getMilestoneTree();
    this.updateMilestones();

    // this.output = document.querySelector(".varOutput");
    // this.outputResults = "time,t,rho,delta<br>";
  }
  getBuyingConditions() {
    const activeStratConditions = [
      () => this.variables[0].lvl < this.variables[1].lvl * 4 + (this.milestones[0] ? 2 : 1),
      true,
      true,
      () => (this.milestones[2] ? this.variables[3].cost + l10(4 + 0.5 * (this.variables[3].lvl % 8) + 0.0001) < this.variables[4].cost : true),
      true,
      true, // b2
      true // b3
    ];
    const conditions: { [key in strat]: Array<boolean | Function> } = {
      RZ: new Array(7).fill(true),
      RZd: activeStratConditions,
      RZdBH: activeStratConditions,
      RZSpiralswap: activeStratConditions,
      RZMS: activeStratConditions,
      RZnoB: [true, true, false, true, true, false, false]
    };
    const condition = conditions[this.strat].map((v) => (typeof v === "function" ? v : () => v));
    return condition;
  }
  getMilestoneConditions() {
    return [
      () => true,
      () => true,
      () => this.variables[2].lvl < 1,
      () => this.milestones[1] == 1,
      () => this.milestones[2] == 1,
      () => this.milestones[2] == 1,
      () => this.variables[6].lvl < 2 // b3
    ];
  }
  getMilestoneTree() {
    const tree: { [key in strat]: Array<Array<number>> } = {
      RZ: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 0],
        [2, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 0]
      ],
      RZd: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 0],
        [2, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 0]
      ],
      RZdBH: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 0],
        [2, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 1]
      ],
      RZSpiralswap: [
        [0, 0, 0, 0], // 0
        [0, 1, 0, 0], // delta
        [1, 1, 0, 0], // 1/3 <-> w2
        [2, 1, 0, 0], // 2/3 <-> w2
        [3, 1, 0, 0], // 3/3 <-> w2
        [3, 1, 1, 0], // 3/3 && w2
        [3, 1, 1, 0], // RZSpiralswap
        [3, 1, 1, 1] // Dummy line
      ],
      RZMS: [
        [0, 0, 0, 0], // 0
        [0, 1, 0, 0], // delta
        [0, 1, 1, 0], // w2 <-> 1/3
        [1, 1, 1, 0], // w2 <-> 2/3
        [2, 1, 1, 0], // w2 <-> 3/3
        [3, 1, 1, 0], // w2 && 3/3
        [3, 1, 1, 0],
        [3, 1, 1, 1] // Dummy line
      ],
      RZnoB: [
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 0],
        [2, 1, 1, 0],
        [3, 1, 1, 0],
        [3, 1, 1, 0]
      ]
    };
    return tree[this.strat];
  }
  getTotMult(val: number) {
    return Math.max(0, val * this.tauFactor * 2.102 + l10(2));
  }
  updateMilestones() {
    const points = [0, 25, 50, 125, 250, 400, 600];
    let stage = binarySearch(points, Math.max(this.lastPub, this.maxRho));
    const max = [3, 1, 1, 1];
    const originPriority = [2, 1, 3];
    const peripheryPriority = [2, 3, 1];

    if (this.strat === "RZSpiralswap") {
      // RZSS
      if (stage <= 1 || stage == 5) {
        this.milestones = this.milestoneTree[Math.min(this.milestoneTree.length - 1, stage)];
      } else if (stage <= 4) {
        // Spiralswap
        let priority = originPriority;
        if (
          /*this.maxRho < this.lastPub + 2 &&*/ this.t_var <= 1.25 ||
          (this.t_var >= 15 && this.t_var <= 20) ||
          (this.t_var >= 26 && this.t_var <= 30) ||
          (this.t_var >= 34 && this.t_var <= 37) ||
          (this.t_var >= 44 && this.t_var <= 47) ||
          (this.t_var >= 53.5 && this.t_var <= 56) ||
          (this.t_var >= 61.5 && this.t_var <= 64.5) ||
          (this.t_var >= 72.5 && this.t_var <= 75.5) ||
          (this.t_var >= 89 && this.t_var <= 92) ||
          (this.t_var >= 96.5 && this.t_var <= 98.5) ||
          (this.t_var >= 107.5 && this.t_var <= 110.5) ||
          (this.t_var >= 124.5 && this.t_var <= 127.25) ||
          (this.t_var >= 135 && this.t_var <= 137.75)
        )
          priority = peripheryPriority;

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
      if (stage <= 1 || stage == 5) {
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
  async simulate() {
    let pubCondition = false;
    while (!pubCondition) {
      if (!global.simulating) break;
      // Prevent lookup table from retrieving values from wrong sim settings
      if (!this.ticks && (this.dt != lookups.prevDt || this.ddt != lookups.prevDdt)) {
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
      pubCondition = (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0] || this.curMult > 15) && this.pubRho > 9;
      this.ticks++;
    }
    // Printing
    // this.output.innerHTML = this.outputResults;
    // this.outputResults = '';
    this.pubMulti = Math.pow(10, this.getTotMult(this.pubRho) - this.totMult);
    let result = createResult(this, "");

    while (this.boughtVars[this.boughtVars.length - 1].timeStamp > this.pubT) this.boughtVars.pop();
    global.varBuy.push([result[7], this.boughtVars]);

    return result;
  }
  tick() {
    let t_dot;
    if (this.milestones[3]) {
      t_dot = getBlackholeSpeed(this.zTerm);
      this.offGrid = true;
    } else t_dot = 1 / resolution;
    this.t_var += (this.dt * t_dot) / 1.5;
    let tTerm = l10(this.t_var);
    let bonus = l10(this.dt) + this.totMult;
    let w1Term = this.milestones[1] ? this.variables[3].value : 0;
    let w2Term = this.milestones[2] ? this.variables[4].value : 0;
    let w3Term = this.milestones[2] ? this.variables[5].value : 0;
    let c1Term = this.variables[0].value * c1Exp[this.milestones[0]];
    let c2Term = this.variables[1].value;
    let bTerm = getb(this.variables[2].lvl + this.variables[6].lvl);
    let z = zeta(this.t_var, this.ticks, this.offGrid, lookups.zetaLookup);
    if (this.milestones[1]) {
      let tmpZ = zeta(this.t_var + 0.0001, this.ticks, this.offGrid, lookups.zetaDerivLookup);
      let dr = tmpZ[0] - z[0];
      let di = tmpZ[1] - z[1];
      let derivTerm = l10(Math.sqrt(dr * dr + di * di)) + 4;
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
    if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < 8 || global.forcedPubTime !== Infinity) {
      this.maxTauH = this.tauH;
      this.pubT = this.t;
      this.pubRho = this.maxRho;
    }
    // this.outputResults += `${this.t},${this.t_var},${this.currencies[0]},${this.currencies[1]}<br>`;
  }
  buyVariables() {
    let currencyIndices = [0, 0, 0, 1, 1, 1, 0];
    for (let i = this.variables.length - 1; i >= 0; i--)
      while (true) {
        if (this.currencies[currencyIndices[i]] > this.variables[i].cost && this.conditions[i]() && this.milestoneConditions[i]()) {
          this.currencies[currencyIndices[i]] = subtract(this.currencies[currencyIndices[i]], this.variables[i].cost);
          if (this.maxRho + 5 > this.lastPub) {
            this.boughtVars.push({
              variable: this.varNames[i],
              level: this.variables[i].lvl + 1,
              cost: this.variables[i].cost,
              timeStamp: this.t
            });
          }
          this.variables[i].buy();
        } else break;
      }
  }
}
