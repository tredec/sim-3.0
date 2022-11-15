import { global } from "../../Sim/main.js";
import { logToExp, simResult, theoryData } from "../../Utils/simHelpers.js";
import { add, createResult, l10, subtract } from "../../Utils/simHelpers.js";
import { findIndex, sleep } from "../../Utils/helperFunctions.js";
import { variableInterface } from "../../Utils/simHelpers.js";
import Variable from "../../Utils/variable.js";

export default async function t8(data: theoryData): Promise<simResult> {
  let sim = new t8Sim(data);
  let res = await sim.simulate();
  return res;
}

class t8Sim {
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
  //pub values
  tauH: number;
  maxTauH: number;
  pubT: number;
  pubRho: number;
  //milestones  [dimensions, b1exp, b2exp, b3exp]
  milestones: Array<number>;
  bounds: Array<Array<Array<number>>>;
  defaultStates: Array<Array<number>>;
  dts: Array<number>;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  msTimer: number;
  pubMulti: number;
  result: Array<any>;

  getBuyingConditions() {
    let conditions: Array<Array<boolean | Function>> = [
      [true, true, true, true, true], //T8
      [true, true, false, true, true], //T8noC3
      [true, true, true, true, false], //T8noC5
      [true, true, false, true, false], //T8noC35
      [() => this.curMult < 1.6, true, () => this.curMult < 2.3, true, () => this.curMult < 2.3], //T8snax
      [() => this.variables[0].cost + 1 < Math.min(this.variables[1].cost, this.variables[3].cost), true, false, true, true], //T8noC3d
      [() => this.variables[0].cost + 1 < Math.min(this.variables[1].cost, this.variables[3].cost), true, true, true, false], //T8noC5d
      [() => this.variables[0].cost + 1 < Math.min(this.variables[1].cost, this.variables[3].cost), true, false, true, false], //T8noC35d
      [() => this.variables[0].cost + 1 < Math.min(this.variables[1].cost, this.variables[3].cost), true, true, true, true], //T8d
      [
        () => this.variables[0].cost + l10(8) < Math.min(this.variables[1].cost, this.variables[3].cost),
        true,
        () => this.variables[2].cost + l10(2.5) < Math.min(this.variables[1].cost, this.variables[3].cost),
        true,
        () => this.variables[4].cost + l10(4) < Math.min(this.variables[1].cost, this.variables[3].cost)
      ], //T8Play
      [
        () => this.variables[0].cost + l10(8) < Math.min(this.variables[1].cost, this.variables[3].cost),
        true,
        () => this.variables[2].cost + l10(2.5) < Math.min(this.variables[1].cost, this.variables[3].cost),
        true,
        () => this.variables[4].cost + l10(2.5) < Math.min(this.variables[1].cost, this.variables[3].cost)
      ] //T8PlaySolarswap
    ];
    conditions = conditions.map((elem) => elem.map((i) => (typeof i === "function" ? i : () => i)));
    return conditions;
  }
  getMilestoneConditions() {
    let conditions: Array<Function> = [() => true, () => true, () => true, () => true, () => true];
    return conditions;
  }
  getMilestoneTree() {
    let tree: Array<Array<Array<number>>> = [
      [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [2, 0, 0, 0],
        [0, 0, 0, 3],
        [1, 0, 3, 0],
        [2, 0, 3, 0],
        [2, 0, 3, 1],
        [2, 0, 3, 2],
        [2, 0, 3, 3],
        [2, 1, 3, 3],
        [2, 2, 3, 3],
        [2, 3, 3, 3]
      ], //t8
      [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [2, 0, 0, 0],
        [2, 0, 1, 0],
        [2, 0, 2, 0],
        [2, 0, 3, 0],
        [2, 0, 3, 1],
        [2, 0, 3, 2],
        [2, 0, 3, 3]
      ], //t8noC3
      [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [2, 0, 0, 0],
        [2, 0, 1, 0],
        [2, 0, 2, 0],
        [2, 0, 3, 0],
        [2, 1, 3, 0],
        [2, 2, 3, 0],
        [2, 3, 3, 0]
      ], //t8noC5
      [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [2, 0, 0, 0],
        [2, 0, 1, 0],
        [2, 0, 2, 0],
        [2, 0, 3, 0]
      ], //t8noC35
      [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [2, 0, 0, 0],
        [0, 0, 0, 3],
        [1, 0, 3, 0],
        [2, 0, 3, 0],
        [2, 0, 3, 1],
        [2, 0, 3, 2],
        [2, 0, 3, 3],
        [2, 1, 3, 3],
        [2, 2, 3, 3],
        [2, 3, 3, 3]
      ], //t8snax
      [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [2, 0, 0, 0],
        [2, 0, 1, 0],
        [2, 0, 2, 0],
        [2, 0, 3, 0],
        [2, 0, 3, 1],
        [2, 0, 3, 2],
        [2, 0, 3, 3]
      ], //t8noC3d
      [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [2, 0, 0, 0],
        [2, 0, 1, 0],
        [2, 0, 2, 0],
        [2, 0, 3, 0],
        [2, 1, 3, 0],
        [2, 2, 3, 0],
        [2, 3, 3, 0]
      ], //t8noC5d
      [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [2, 0, 0, 0],
        [2, 0, 1, 0],
        [2, 0, 2, 0],
        [2, 0, 3, 0]
      ], //t8noC35d
      ...new Array(3).fill([
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [2, 0, 0, 0],
        [0, 0, 0, 3],
        [1, 0, 3, 0],
        [2, 0, 3, 0],
        [2, 0, 3, 1],
        [2, 0, 3, 2],
        [2, 0, 3, 3],
        [2, 1, 3, 3],
        [2, 2, 3, 3],
        [2, 3, 3, 3]
      ]) //t8d, t8Play, t8PlaySolarswap
    ];
    return tree;
  }

  getTotMult(val: number) {
    return Math.max(0, val * 0.15) + l10((this.sigma / 20) ** (this.sigma < 65 ? 0 : this.sigma < 75 ? 1 : this.sigma < 85 ? 2 : 3));
  }
  updateMilestones(): void {
    const stage = Math.min(11, Math.floor(Math.max(this.lastPub, this.maxRho) / 20));
    this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
  }
  dn(ix: number = this.x, iy: number = this.y, iz: number = this.z) {
    if (this.milestones[0] === 0) {
      this.dx = 10 * (iy - ix);
      this.dy = ix * (28 - iz) - iy;
      this.dz = ix * iy - (8 * iz) / 3;
    }
    if (this.milestones[0] === 1) {
      this.dx = 10 * (40 * (iy - ix));
      this.dy = 10 * (-12 * ix - ix * iz + 28 * iy);
      this.dz = 10 * (ix * iy - 3 * iz);
    }
    if (this.milestones[0] === 2) {
      this.dx = 500 * (-iy - iz);
      this.dy = 500 * (ix + 0.1 * iy);
      this.dz = 500 * (0.1 + iz * (ix - 14));
    }
  }
  constructor(data: theoryData) {
    this.stratIndex = findIndex(data.strats, data.strat);
    this.strat = data.strat;
    this.theory = "T8";
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
      new Variable({ lvl: 1, cost: 10, costInc: 1.5172, value: 1, stepwisePowerSum: { default: true } }),
      new Variable({ cost: 20, costInc: 64, varBase: 2 }),
      new Variable({ cost: 1e2, costInc: 2 ** (1.15 * Math.log2(3)), varBase: 3 }),
      new Variable({ cost: 1e2, costInc: 2 ** (1.15 * Math.log2(5)), varBase: 5 }),
      new Variable({ cost: 1e2, costInc: 2 ** (1.15 * Math.log2(7)), varBase: 7 })
    ];
    //pub values
    this.tauH = 0;
    this.maxTauH = 0;
    this.pubT = 0;
    this.pubRho = 0;
    //milestones  [attractor, c3exp, c4exp, c5exp]
    this.milestones = [0, 0, 0, 0];
    //attractor stuff
    this.bounds = [
      [
        [0, -20, 20],
        [0, -27, 27],
        [24.5, 1, 48]
      ],
      [
        [0.5, -23, 24],
        [1, -25, 27],
        [20.5, 1, 40]
      ],
      [
        [1, -20, 22],
        [-1.5, -21, 18],
        [8, 0, 37]
      ]
    ];
    this.defaultStates = [
      [-6, -8, 26],
      [-10.6, -4.4, 28.6],
      [-6, 15, 0]
    ];
    this.dts = [0.02, 0.002, 0.00014];
    this.x = this.defaultStates[this.milestones[0]][0];
    this.y = this.defaultStates[this.milestones[0]][1];
    this.z = this.defaultStates[this.milestones[0]][2];
    this.dx = 0;
    this.dy = 0;
    this.dz = 0;
    this.msTimer = 0;
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
      if (this.lastPub < 220) this.updateMilestones();
      this.curMult = 10 ** (this.getTotMult(this.maxRho) - this.totMult);
      this.buyVariables();
      pubCondition = (global.forcedPubTime !== Infinity ? this.t > global.forcedPubTime : this.t > this.pubT * 2 || this.pubRho > this.cap[0]) && this.pubRho > 8;
      this.ticks++;
    }
    this.pubMulti = 10 ** (this.getTotMult(this.pubRho) - this.totMult);
    this.result = createResult(this, "");
    return this.result;
  }
  tick() {
    this.dn();

    let midpointx = this.x + this.dx * 0.5 * this.dts[this.milestones[0]];
    let midpointy = this.y + this.dy * 0.5 * this.dts[this.milestones[0]];
    let midpointz = this.z + this.dz * 0.5 * this.dts[this.milestones[0]];

    this.dn(midpointx, midpointy, midpointz);

    this.x += this.dx * this.dts[this.milestones[0]];
    this.y += this.dy * this.dts[this.milestones[0]];
    this.z += this.dz * this.dts[this.milestones[0]];

    this.dn();

    let xlowerBound = (this.bounds[this.milestones[0]][0][1] - this.bounds[this.milestones[0]][0][0]) * 5 + this.bounds[this.milestones[0]][0][0];
    let xupperBound = (this.bounds[this.milestones[0]][0][2] - this.bounds[this.milestones[0]][0][0]) * 5 + this.bounds[this.milestones[0]][0][0];
    let ylowerBound = (this.bounds[this.milestones[0]][1][1] - this.bounds[this.milestones[0]][1][0]) * 5 + this.bounds[this.milestones[0]][1][0];
    let yupperBound = (this.bounds[this.milestones[0]][1][2] - this.bounds[this.milestones[0]][1][0]) * 5 + this.bounds[this.milestones[0]][1][0];
    let zlowerBound = (this.bounds[this.milestones[0]][2][1] - this.bounds[this.milestones[0]][2][0]) * 5 + this.bounds[this.milestones[0]][2][0];
    let zupperBound = (this.bounds[this.milestones[0]][2][2] - this.bounds[this.milestones[0]][2][0]) * 5 + this.bounds[this.milestones[0]][2][0];

    if (this.x < xlowerBound || this.x > xupperBound || this.y < ylowerBound || this.y > yupperBound || this.z < zlowerBound || this.z > zupperBound) {
      this.x = this.defaultStates[this.milestones[0]][0];
      this.y = this.defaultStates[this.milestones[0]][1];
      this.z = this.defaultStates[this.milestones[0]][2];
    }

    this.dn();

    this.msTimer++;
    if (this.msTimer == 335 && this.stratIndex === 10) {
      this.x = this.defaultStates[this.milestones[0]][0];
      this.y = this.defaultStates[this.milestones[0]][1];
      this.z = this.defaultStates[this.milestones[0]][2];
      this.msTimer = 0;
    }

    let vc3 = this.variables[2].value * (1 + 0.05 * this.milestones[1]);
    let vc4 = this.variables[3].value * (1 + 0.05 * this.milestones[2]);
    let vc5 = this.variables[4].value * (1 + 0.05 * this.milestones[3]);

    let dx2Term = vc3 + l10(this.dx * this.dx);
    let dy2Term = vc4 + l10(this.dy * this.dy);
    let dz2Term = vc5 + l10(this.dz * this.dz);

    let rhodot = l10(this.dt) + this.totMult + this.variables[0].value + this.variables[1].value + add(add(dx2Term, dy2Term), dz2Term) / 2 - 2;
    this.rho = add(this.rho, rhodot);

    this.t += this.dt / 1.5;
    this.dt *= this.ddt;
    if (this.maxRho < this.recovery.value) this.recovery.time = this.t;

    this.tauH = (this.maxRho - this.lastPub) / (this.t / 3600);
    if (this.maxTauH < this.tauH || this.maxRho >= this.cap[0] - this.cap[1] || this.pubRho < 8 || global.forcedPubTime !== Infinity) {
      this.maxTauH = this.tauH;
      this.pubT = this.t;
      this.pubRho = this.maxRho;
    }
  }
  buyVariables() {
    for (let i = this.variables.length - 1; i >= 0; i--)
      while (true) {
        if (this.rho > this.variables[i].cost && (<Function>this.conditions[this.stratIndex][i])() && this.milestoneConditions[i]()) {
          this.rho = subtract(this.rho, this.variables[i].cost);
          this.variables[i].buy();
        } else break;
      }
  }
}
