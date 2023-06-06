var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { global } from "../../Sim/main.js";
import { add, createResult, l10, subtract } from "../../Utils/simHelpers.js";
import { findIndex, sleep } from "../../Utils/helperFunctions.js";
import Variable, { ExponentialCost, StepwiseCost } from "../../Utils/variable.js";
import { getTauFactor } from "../../Sim/Components/helpers.js";
export default function rz(data) {
    return __awaiter(this, void 0, void 0, function* () {
        let sim = new rzSim(data);
        let res = yield sim.simulate();
        return res;
    });
}
const resolution = 4;
const getBlackholeSpeed = (z) => Math.min(Math.pow(z, 2) + 0.004, 1 / resolution);
const getb = (level) => 1 << level;
const getbMarginTerm = (level) => Math.pow(10, -getb(level));
const c1Exp = [1, 1.14, 1.21, 1.25];
let interpolate = (t) => {
    let v1 = t * t;
    let v2 = 1 - (1 - t) * (1 - t);
    return v1 * (1 - t) + v2 * t;
};
const zeta01Table = [
    [-1.4603545088095868, 0],
    [-1.4553643660270397, -0.097816768303847834],
    [-1.4405420816461549, -0.19415203999960912],
    [-1.4163212212231056, -0.28759676077859003],
    [-1.3833896356482762, -0.37687944704548237],
    [-1.342642133546631, -0.46091792561979039],
    [-1.2951228211781993, -0.53885377540755575],
    [-1.241963631033884, -0.61006813708679553],
    [-1.1843251208316332, -0.67417998953208147],
    [-1.1233443487784422, -0.73102985025790079],
    [-1.0600929156957051, -0.78065292187264657],
    [-0.99554650742447182, -0.82324597632456875],
    [-0.93056577332974644, -0.85913190352918178],
    [-0.86588730259376534, -0.88872508711130638],
    [-0.80212284363487529, -0.91249984322356881],
    [-0.73976469567777448, -0.93096325430469185],
    [-0.679195280748696, -0.94463296464946644],
    [-0.62069916587171792, -0.954019930248939],
    [-0.56447615104191817, -0.95961573448940385],
    [-0.5106543967354793, -0.96188386780424429],
    [-0.45930289034601818, -0.96125428450587913],
    [-0.41044282155026063, -0.95812055392531381],
    [-0.36405764581325084, -0.95283898111582577],
    [-0.32010176657189976, -0.94572915808929037],
    [-0.27850786866599236, -0.93707550120555738],
    [-0.23919299859739693, -0.92712942212746241],
    [-0.20206352115099815, -0.91611186212496687],
    [-0.167019095423191, -0.90421598956695581],
    [-0.13395581328989362, -0.89160991763812381],
    [-0.10276863503870383, -0.87843934448552852],
    [-0.073353244053944222, -0.86483005263542623],
    [-0.045607427657960491, -0.850890230359152],
    [-0.019432076150895955, -0.836712596410336],
    [0.0052681222316752355, -0.82237632273994077],
    [0.028584225755178324, -0.80794875873014349],
    [0.050602769823360656, -0.7934869662472297],
    [0.071405640533511838, -0.77903907825261309],
    [0.091070056261173163, -0.76464549549431216],
    [0.10966862939766708, -0.750339936434268],
    [0.12726948615366909, -0.73615035542727014],
    [0.14393642707718907, -0.722099743531673]
];
// Linear interpolation lol
let zetaSmall = (t) => {
    let fullIndex = t * (zeta01Table.length - 1);
    let index = Math.floor(fullIndex);
    let offset = fullIndex - index;
    let re = zeta01Table[index][0] * (1 - offset) + zeta01Table[index + 1][0] * offset;
    let im = zeta01Table[index][1] * (1 - offset) + zeta01Table[index + 1][1] * offset;
    return [re, im, Math.sqrt(re * re + im * im)];
};
let even = (n) => {
    if (n % 2 == 0)
        return 1;
    else
        return -1;
};
let theta = (t) => {
    return (t / 2) * Math.log(t / 2 / Math.PI) - t / 2 - Math.PI / 8 + 1 / 48 / t + 7 / 5760 / t / t / t;
};
let C = (n, z) => {
    if (n == 0)
        return (+0.38268343236508977173 * Math.pow(z, 0.0) +
            0.43724046807752044936 * Math.pow(z, 2.0) +
            0.13237657548034352332 * Math.pow(z, 4.0) -
            0.01360502604767418865 * Math.pow(z, 6.0) -
            0.01356762197010358089 * Math.pow(z, 8.0) -
            0.00162372532314446528 * Math.pow(z, 10.0) +
            0.00029705353733379691 * Math.pow(z, 12.0) +
            0.0000794330087952147 * Math.pow(z, 14.0) +
            0.00000046556124614505 * Math.pow(z, 16.0) -
            0.00000143272516309551 * Math.pow(z, 18.0) -
            0.00000010354847112313 * Math.pow(z, 20.0) +
            0.00000001235792708386 * Math.pow(z, 22.0) +
            0.0000000017881083858 * Math.pow(z, 24.0) -
            0.0000000000339141439 * Math.pow(z, 26.0) -
            0.0000000000163266339 * Math.pow(z, 28.0) -
            0.00000000000037851093 * Math.pow(z, 30.0) +
            0.00000000000009327423 * Math.pow(z, 32.0) +
            0.00000000000000522184 * Math.pow(z, 34.0) -
            0.00000000000000033507 * Math.pow(z, 36.0) -
            0.00000000000000003412 * Math.pow(z, 38.0) +
            0.00000000000000000058 * Math.pow(z, 40.0) +
            0.00000000000000000015 * Math.pow(z, 42.0));
    else if (n == 1)
        return (-0.02682510262837534703 * Math.pow(z, 1.0) +
            0.01378477342635185305 * Math.pow(z, 3.0) +
            0.03849125048223508223 * Math.pow(z, 5.0) +
            0.00987106629906207647 * Math.pow(z, 7.0) -
            0.00331075976085840433 * Math.pow(z, 9.0) -
            0.00146478085779541508 * Math.pow(z, 11.0) -
            0.00001320794062487696 * Math.pow(z, 13.0) +
            0.00005922748701847141 * Math.pow(z, 15.0) +
            0.00000598024258537345 * Math.pow(z, 17.0) -
            0.00000096413224561698 * Math.pow(z, 19.0) -
            0.00000018334733722714 * Math.pow(z, 21.0) +
            0.00000000446708756272 * Math.pow(z, 23.0) +
            0.00000000270963508218 * Math.pow(z, 25.0) +
            0.00000000007785288654 * Math.pow(z, 27.0) -
            0.00000000002343762601 * Math.pow(z, 29.0) -
            0.00000000000158301728 * Math.pow(z, 31.0) +
            0.00000000000012119942 * Math.pow(z, 33.0) +
            0.00000000000001458378 * Math.pow(z, 35.0) -
            0.00000000000000028786 * Math.pow(z, 37.0) -
            0.00000000000000008663 * Math.pow(z, 39.0) -
            0.00000000000000000084 * Math.pow(z, 41.0) +
            0.00000000000000000036 * Math.pow(z, 43.0) +
            0.00000000000000000001 * Math.pow(z, 45.0));
    else if (n == 2)
        return (+0.00518854283029316849 * Math.pow(z, 0.0) +
            0.00030946583880634746 * Math.pow(z, 2.0) -
            0.01133594107822937338 * Math.pow(z, 4.0) +
            0.00223304574195814477 * Math.pow(z, 6.0) +
            0.00519663740886233021 * Math.pow(z, 8.0) +
            0.00034399144076208337 * Math.pow(z, 10.0) -
            0.00059106484274705828 * Math.pow(z, 12.0) -
            0.00010229972547935857 * Math.pow(z, 14.0) +
            0.00002088839221699276 * Math.pow(z, 16.0) +
            0.00000592766549309654 * Math.pow(z, 18.0) -
            0.00000016423838362436 * Math.pow(z, 20.0) -
            0.00000015161199700941 * Math.pow(z, 22.0) -
            0.00000000590780369821 * Math.pow(z, 24.0) +
            0.00000000209115148595 * Math.pow(z, 26.0) +
            0.00000000017815649583 * Math.pow(z, 28.0) -
            0.00000000001616407246 * Math.pow(z, 30.0) -
            0.00000000000238069625 * Math.pow(z, 32.0) +
            0.00000000000005398265 * Math.pow(z, 34.0) +
            0.00000000000001975014 * Math.pow(z, 36.0) +
            0.00000000000000023333 * Math.pow(z, 38.0) -
            0.00000000000000011188 * Math.pow(z, 40.0) -
            0.00000000000000000416 * Math.pow(z, 42.0) +
            0.00000000000000000044 * Math.pow(z, 44.0) +
            0.00000000000000000003 * Math.pow(z, 46.0));
    else if (n == 3)
        return (-0.0013397160907194569 * Math.pow(z, 1.0) +
            0.0037442151363793937 * Math.pow(z, 3.0) -
            0.00133031789193214681 * Math.pow(z, 5.0) -
            0.00226546607654717871 * Math.pow(z, 7.0) +
            0.00095484999985067304 * Math.pow(z, 9.0) +
            0.00060100384589636039 * Math.pow(z, 11.0) -
            0.00010128858286776622 * Math.pow(z, 13.0) -
            0.00006865733449299826 * Math.pow(z, 15.0) +
            0.00000059853667915386 * Math.pow(z, 17.0) +
            0.00000333165985123995 * Math.pow(z, 19.0) +
            0.00000021919289102435 * Math.pow(z, 21.0) -
            0.00000007890884245681 * Math.pow(z, 23.0) -
            0.0000000094146850813 * Math.pow(z, 25.0) +
            0.00000000095701162109 * Math.pow(z, 27.0) +
            0.00000000018763137453 * Math.pow(z, 29.0) -
            0.00000000000443783768 * Math.pow(z, 31.0) -
            0.00000000000224267385 * Math.pow(z, 33.0) -
            0.00000000000003627687 * Math.pow(z, 35.0) +
            0.00000000000001763981 * Math.pow(z, 37.0) +
            0.00000000000000079608 * Math.pow(z, 39.0) -
            0.0000000000000000942 * Math.pow(z, 41.0) -
            0.00000000000000000713 * Math.pow(z, 43.0) +
            0.00000000000000000033 * Math.pow(z, 45.0) +
            0.00000000000000000004 * Math.pow(z, 47.0));
    else
        return (+0.00046483389361763382 * Math.pow(z, 0.0) -
            0.00100566073653404708 * Math.pow(z, 2.0) +
            0.00024044856573725793 * Math.pow(z, 4.0) +
            0.00102830861497023219 * Math.pow(z, 6.0) -
            0.00076578610717556442 * Math.pow(z, 8.0) -
            0.00020365286803084818 * Math.pow(z, 10.0) +
            0.00023212290491068728 * Math.pow(z, 12.0) +
            0.0000326021442438652 * Math.pow(z, 14.0) -
            0.00002557906251794953 * Math.pow(z, 16.0) -
            0.00000410746443891574 * Math.pow(z, 18.0) +
            0.00000117811136403713 * Math.pow(z, 20.0) +
            0.00000024456561422485 * Math.pow(z, 22.0) -
            0.00000002391582476734 * Math.pow(z, 24.0) -
            0.00000000750521420704 * Math.pow(z, 26.0) +
            0.00000000013312279416 * Math.pow(z, 28.0) +
            0.00000000013440626754 * Math.pow(z, 30.0) +
            0.00000000000351377004 * Math.pow(z, 32.0) -
            0.00000000000151915445 * Math.pow(z, 34.0) -
            0.00000000000008915418 * Math.pow(z, 36.0) +
            0.00000000000001119589 * Math.pow(z, 38.0) +
            0.0000000000000010516 * Math.pow(z, 40.0) -
            0.00000000000000005179 * Math.pow(z, 42.0) -
            0.00000000000000000807 * Math.pow(z, 44.0) +
            0.00000000000000000011 * Math.pow(z, 46.0) +
            0.00000000000000000004 * Math.pow(z, 48.0));
};
let logLookup = [];
let sqrtLookup = [];
let riemannSiegelZeta = (t, n) => {
    let Z = 0;
    let R = 0;
    let fullN = Math.sqrt(t / (2 * Math.PI));
    let N = Math.floor(fullN);
    let p = fullN - N;
    let th = theta(t);
    for (let j = 1; j <= N; ++j) {
        if (logLookup[j] === undefined) {
            logLookup[j] = Math.log(j);
            sqrtLookup[j] = Math.sqrt(j);
        }
        Z += Math.cos(th - t * logLookup[j]) / sqrtLookup[j];
    }
    Z *= 2;
    for (let k = 0; k <= n; ++k) {
        R += C(k, 2 * p - 1) * Math.pow((2 * Math.PI) / t, k * 0.5);
    }
    R *= even(N - 1) * Math.pow((2 * Math.PI) / t, 0.25);
    Z += R;
    return [Z * Math.cos(th), -Z * Math.sin(th), Z];
};
// The lookup table only works before black hole is enabled in a pub, because then the time values would get misaligned.
let zetaLookup = [];
let zetaDerivLookup = [];
let prevDt = 1.5;
let prevDdt = 1.0001;
let zeta = (T, ticks, offGrid, cache) => {
    if (!offGrid && cache[ticks])
        return cache[ticks];
    let t = Math.abs(T);
    let z;
    if (t >= 1)
        z = riemannSiegelZeta(t, 1);
    else if (t < 0.1)
        z = zetaSmall(t);
    else {
        let offset = interpolate(((t - 0.1) * 10) / 9);
        let a = zetaSmall(t);
        let b = riemannSiegelZeta(t, 1);
        z = [a[0] * (1 - offset) + b[0] * offset, a[1] * (1 - offset) + b[1] * offset, a[2] * (1 - offset) + Math.abs(b[2]) * offset];
    }
    if (T < 0)
        z[1] = -z[1];
    if (!offGrid)
        cache[ticks] = z;
    return z;
};
let binarySearch = (arr, target) => {
    let l = 0;
    let r = arr.length - 1;
    while (l < r) {
        let m = Math.ceil((l + r) / 2);
        if (arr[m] <= target)
            l = m;
        else
            r = m - 1;
    }
    return l;
};
class rzSim {
    constructor(data) {
        var _a;
        this.stratIndex = findIndex(data.strats, data.strat);
        this.strat = data.strat;
        this.theory = "RZ";
        this.tauFactor = getTauFactor(this.theory);
        this.cap = typeof data.cap === "number" && data.cap > 0 ? [data.cap, 1] : [Infinity, 0];
        this.recovery = (_a = data.recovery) !== null && _a !== void 0 ? _a : { value: 0, time: 0, recoveryTime: false };
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
        this.result = [];
        this.pubMulti = 0;
        this.conditions = this.getBuyingConditions();
        this.milestoneConditions = this.getMilestoneConditions();
        this.milestoneTree = this.getMilestoneTree();
        this.updateMilestones();
        // this.output = document.querySelector(".varOutput");
        // this.outputResults = "time,t,rho,delta<br>";
    }
    getBuyingConditions() {
        let conditions = [
            new Array(7).fill(true),
            ...new Array(4).fill([
                () => this.variables[0].lvl < this.variables[1].lvl * 4 + (this.milestones[0] ? 2 : 1),
                true,
                true,
                () => (this.milestones[2] ? this.variables[3].cost + l10(4 + 0.5 * (this.variables[3].lvl % 8) + 0.0001) < this.variables[4].cost : true),
                true,
                true,
                true // b3
            ]),
            [true, true, false, true, true, false, false]
        ];
        conditions = conditions.map((elem) => elem.map((i) => (typeof i === "function" ? i : () => i)));
        return conditions;
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
        return [
            [
                [0, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 1, 0],
                [1, 1, 1, 0],
                [2, 1, 1, 0],
                [3, 1, 1, 0],
                [3, 1, 1, 0] // RZ (idle)
            ],
            [
                [0, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 1, 0],
                [1, 1, 1, 0],
                [2, 1, 1, 0],
                [3, 1, 1, 0],
                [3, 1, 1, 0] // RZd
            ],
            [
                [0, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 1, 0],
                [1, 1, 1, 0],
                [2, 1, 1, 0],
                [3, 1, 1, 0],
                [3, 1, 1, 1] // RZdBH
            ],
            [
                [0, 0, 0, 0],
                [0, 1, 0, 0],
                [1, 1, 0, 0],
                [2, 1, 0, 0],
                [3, 1, 0, 0],
                [3, 1, 1, 0],
                [3, 1, 1, 0],
                [3, 1, 1, 1] // Dummy line
            ],
            [
                [0, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 1, 0],
                [1, 1, 1, 0],
                [2, 1, 1, 0],
                [3, 1, 1, 0],
                [3, 1, 1, 0],
                [3, 1, 1, 1] // Dummy line
            ],
            [
                [0, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 1, 0],
                [1, 1, 1, 0],
                [2, 1, 1, 0],
                [3, 1, 1, 0],
                [3, 1, 1, 0] // RZnob
            ]
        ];
    }
    getTotMult(val) {
        return Math.max(0, val * this.tauFactor * 2.102 + l10(2));
    }
    updateMilestones() {
        const points = [0, 25, 50, 125, 250, 400, 600];
        let stage = binarySearch(points, Math.max(this.lastPub, this.maxRho));
        const max = [3, 1, 1, 1];
        const originPriority = [2, 1, 3];
        const peripheryPriority = [2, 3, 1];
        if (this.stratIndex == 3) {
            // RZSS
            if (stage <= 1 || stage == 5) {
                this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
            }
            else if (stage <= 4) {
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
                    (this.t_var >= 135 && this.t_var <= 137.75))
                    priority = peripheryPriority;
                let milestoneCount = stage;
                this.milestones = [0, 0, 0, 0];
                for (let i = 0; i < priority.length; i++) {
                    while (this.milestones[priority[i] - 1] < max[priority[i] - 1] && milestoneCount > 0) {
                        this.milestones[priority[i] - 1]++;
                        milestoneCount--;
                    }
                }
            }
            else {
                // Black hole coasting
                if (this.maxRho < this.lastPub)
                    this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
                else
                    this.milestones = this.milestoneTree[this.stratIndex][stage + 1];
            }
        }
        else if (this.stratIndex == 4) {
            // RZMS
            if (stage <= 1 || stage == 5) {
                this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
            }
            else if (stage <= 4) {
                let priority = peripheryPriority;
                if (this.maxRho > this.lastPub)
                    priority = originPriority;
                let milestoneCount = stage;
                this.milestones = [0, 0, 0, 0];
                for (let i = 0; i < priority.length; i++) {
                    while (this.milestones[priority[i] - 1] < max[priority[i] - 1] && milestoneCount > 0) {
                        this.milestones[priority[i] - 1]++;
                        milestoneCount--;
                    }
                }
            }
            else {
                // Black hole coasting
                if (this.maxRho < this.lastPub)
                    this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
                else
                    this.milestones = this.milestoneTree[this.stratIndex][stage + 1];
            }
        }
        else
            this.milestones = this.milestoneTree[this.stratIndex][Math.min(this.milestoneTree[this.stratIndex].length - 1, stage)];
    }
    simulate() {
        return __awaiter(this, void 0, void 0, function* () {
            let pubCondition = false;
            while (!pubCondition) {
                if (!global.simulating)
                    break;
                // Prevent lookup table from retrieving values from wrong sim settings
                if (!this.ticks && (this.dt != prevDt || this.ddt != prevDdt)) {
                    prevDt = this.dt;
                    prevDdt = this.ddt;
                    zetaLookup = [];
                    zetaDerivLookup = [];
                }
                if ((this.ticks + 1) % 500000 === 0)
                    yield sleep();
                this.tick();
                if (this.currencies[0] > this.maxRho)
                    this.maxRho = this.currencies[0];
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
            this.result = createResult(this, "");
            while (this.boughtVars[this.boughtVars.length - 1].timeStamp > this.pubT)
                this.boughtVars.pop();
            global.varBuy.push([this.result[7], this.boughtVars]);
            return this.result;
        });
    }
    tick() {
        let t_dot;
        if (this.milestones[3]) {
            t_dot = getBlackholeSpeed(this.zTerm);
            this.offGrid = true;
        }
        else
            t_dot = 1 / resolution;
        this.t_var += (this.dt * t_dot) / 1.5;
        let tTerm = l10(this.t_var);
        let bonus = l10(this.dt) + this.totMult;
        let w1Term = this.milestones[1] ? this.variables[3].value : 0;
        let w2Term = this.milestones[2] ? this.variables[4].value : 0;
        let w3Term = this.milestones[2] ? this.variables[5].value : 0;
        let c1Term = this.variables[0].value * c1Exp[this.milestones[0]];
        let c2Term = this.variables[1].value;
        let bTerm = getb(this.variables[2].lvl + this.variables[6].lvl);
        let z = zeta(this.t_var, this.ticks, this.offGrid, zetaLookup);
        if (this.milestones[1]) {
            let tmpZ = zeta(this.t_var + 0.0001, this.ticks, this.offGrid, zetaDerivLookup);
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
        if (this.maxRho < this.recovery.value)
            this.recovery.time = this.t;
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
                if (this.currencies[currencyIndices[i]] > this.variables[i].cost && this.conditions[this.stratIndex][i]() && this.milestoneConditions[i]()) {
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
                }
                else
                    break;
            }
    }
}
