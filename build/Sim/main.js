var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { findIndex } from "../Utils/helperFunctions.js";
import { logToExp, convertTime, decimals } from "../Utils/simHelpers.js";
import jsonData from "./data.json" assert { type: "json" };
import { qs, sleep } from "../Utils/helperFunctions.js";
import t1 from "../Theories/T1-T8/T1.js";
import t2 from "../Theories/T1-T8/T2.js";
import t3 from "../Theories/T1-T8/T3.js";
import t4 from "../Theories/T1-T8/T4.js";
import t5 from "../Theories/T1-T8/T5.js";
import t6 from "../Theories/T1-T8/T6.js";
import t7 from "../Theories/T1-T8/T7.js";
import t8 from "../Theories/T1-T8/T8.js";
import { parseCurrencyValue, parseModeInput } from "./Components/parsers.js";
import { getIndexFromTheory, getTauFactor, getTheoryFromIndex } from "./Components/helpers.js";
import wsp from "../Theories/CTs/WSP.js";
import sl from "../Theories/CTs/SL.js";
import ef from "../Theories/CTs/EF.js";
import csr2 from "../Theories/CTs/CSR2.js";
const output = qs(".output");
export const global = {
    dt: 1.5,
    ddt: 1.0001,
    stratFilter: true,
    simulating: false,
    forcedPubTime: Infinity
};
const cache = {
    lastStrat: null,
    simEndTimestamp: 0
};
export function simulate(simData) {
    return __awaiter(this, void 0, void 0, function* () {
        if (global.simulating) {
            global.simulating = false;
            return "Sim stopped.";
        }
        if ((performance.now() - cache.simEndTimestamp) / 1000 < 1)
            return null;
        try {
            let pData = parseData(simData);
            let res = [];
            global.simulating = true;
            switch (pData.mode) {
                case "Single sim":
                    res = [yield singleSim(pData)];
                    break;
                case "Chain":
                    res = yield chainSim(pData);
                    break;
                case "Steps":
                    res = yield stepSim(pData);
                    break;
                case "All":
                    res = yield simAll(pData);
                    break;
            }
            cache.simEndTimestamp = performance.now();
            return res;
        }
        catch (err) {
            return String(err);
        }
    });
}
function parseData(data) {
    const parsedDataObj = {
        theory: data.theory,
        strat: data.strat,
        mode: data.mode,
        hardCap: data.hardCap,
        modeInput: data.modeInput,
        simAllInputs: data.simAllInputs,
        sigma: 0,
        rho: 0,
        cap: Infinity,
        recovery: null
    };
    if (data.mode !== "All" && data.mode !== "Time diff.") {
        //parsing sigma
        if (data.sigma.length > 0 && data.sigma.match(/^[0-9]+$/) !== null && parseInt(data.sigma) >= 0 && parseFloat(data.sigma) % 1 === 0)
            parsedDataObj.sigma = parseInt(data.sigma);
        else if (data.theory.charAt(0) === "T")
            throw "Invalid sigma value. Sigma must be an integer that's >= 0";
        //parsing currency
        if (data.rho.length > 0)
            parsedDataObj.rho = parseCurrencyValue(data.rho, parsedDataObj.theory, parsedDataObj.sigma);
        else
            throw "Input value cannot be empty.";
        //parsing cap if needed
        if (data.mode === "Chain" || data.mode === "Steps") {
            if (data.cap.length > 0)
                parsedDataObj.cap = parseCurrencyValue(data.cap, parsedDataObj.theory, parsedDataObj.sigma);
            else
                throw "Cap value cannot be empty.";
        }
    }
    if (data.mode !== "Single sim" && data.mode !== "Chain") {
        parsedDataObj.modeInput = parseModeInput(data.modeInput, data.mode);
    }
    return parsedDataObj;
}
function singleSim(data) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (findIndex(["Best Overall", "Best Active", "Best Semi-Idle", "Best Idle"], data.strat) !== -1)
            return getBestStrat(data);
        const sendData = {
            strat: data.strat,
            strats: jsonData.strats[getIndexFromTheory(data.theory)],
            sigma: data.sigma,
            rho: data.rho,
            recursionValue: null,
            recovery: (_a = data.recovery) !== null && _a !== void 0 ? _a : { value: 0, time: 0, recoveryTime: false },
            cap: data.hardCap ? data.cap : null
        };
        switch (data.theory) {
            case "T1":
                return yield t1(sendData);
            case "T2":
                return yield t2(sendData);
            case "T3":
                return yield t3(sendData);
            case "T4":
                return yield t4(sendData);
            case "T5":
                return yield t5(sendData);
            case "T6":
                return yield t6(sendData);
            case "T7":
                return yield t7(sendData);
            case "T8":
                return yield t8(sendData);
            case "WSP":
                return yield wsp(sendData);
            case "SL":
                return yield sl(sendData);
            case "EF":
                return yield ef(sendData);
            case "CSR2":
                return yield csr2(sendData);
        }
        throw `Theory ${data.theory} is not defined in singleSim() function. Please contact the author of the sim.`;
    });
}
function chainSim(data) {
    return __awaiter(this, void 0, void 0, function* () {
        let lastPub = data.rho;
        let time = 0;
        const start = data.rho;
        const result = [];
        let stopOtp = logToExp(data.cap);
        let lastLog = 0;
        while (lastPub < data.cap) {
            let st = performance.now();
            if (st - lastLog > 250) {
                lastLog = st;
                output.textContent = `Simulating ${logToExp(lastPub, 0)}/${stopOtp}`;
                yield sleep();
            }
            let res = yield singleSim(Object.assign({}, data));
            if (!global.simulating)
                break;
            if (typeof res[6] === "string")
                cache.lastStrat = res[6].split(" ")[0];
            result.push(res);
            lastPub = res[res.length - 1][0];
            data.rho = lastPub;
            time += res[res.length - 1][1];
        }
        cache.lastStrat = null;
        result.push(["", "", "", "", "ΔTau Total", "", "", `Average <span style="font-size:0.9rem; font-style:italics">&tau;</span>/h`, "Total Time"]);
        const dtau = (data.rho - start) * getTauFactor(data.theory);
        result.push(["", "", "", "", logToExp(dtau, 2), "", "", decimals(dtau / (time / 3600), 5), convertTime(time)]);
        return result;
    });
}
function stepSim(data) {
    return __awaiter(this, void 0, void 0, function* () {
        let time = 0;
        const start = data.rho;
        const result = [];
        let stopOtp = logToExp(data.cap);
        let lastLog = 0;
        while (data.rho < data.cap + 0.00001) {
            let st = performance.now();
            if (st - lastLog > 250) {
                lastLog = st;
                output.textContent = `Simulating ${logToExp(data.rho, 0)}/${stopOtp}`;
                yield sleep();
            }
            let res = yield singleSim(Object.assign({}, data));
            if (!global.simulating)
                break;
            if (typeof res[6] === "string")
                cache.lastStrat = res[6].split(" ")[0];
            result.push(res);
            data.rho += data.modeInput;
            time += res[res.length - 1][1];
        }
        cache.lastStrat = null;
        return result;
    });
}
function simAll(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const sigma = data.modeInput[0];
        const values = data.modeInput.slice(1, data.modeInput.length);
        let res = [];
        for (let i = 0; i < values.length; i++) {
            if (values[i] === 0)
                continue;
            output.innerText = `Simulating ${getTheoryFromIndex(i)}/${getTheoryFromIndex(values.length - 1)}`;
            yield sleep();
            if (!global.simulating)
                break;
            let modes = ["Best Semi-Idle", "Best Overall"];
            if (data.simAllInputs != null)
                modes = [data.simAllInputs[0] ? "Best Semi-Idle" : "Best Idle", data.simAllInputs[1] ? "Best Overall" : "Best Active"];
            let temp = [];
            for (let j = 0; j < modes.length; j++) {
                let sendData = {
                    theory: getTheoryFromIndex(i),
                    strat: modes[j],
                    sigma,
                    rho: values[i],
                    cap: Infinity,
                    mode: "Single Sim"
                };
                temp.push(yield singleSim(sendData));
            }
            res.push(createSimAllOutput(temp));
        }
        res.push([sigma]);
        return res;
    });
}
function createSimAllOutput(arr) {
    return [arr[0][0], arr[0][2], arr[1][7], arr[0][7], decimals(arr[1][7] / arr[0][7], 4), arr[1][5], arr[0][5], arr[1][6], arr[0][6], arr[1][8], arr[0][8], arr[1][4], arr[0][4]];
}
function getBestStrat(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const strats = getStrats(data.theory, data.rho, data.strat);
        let bestSim = new Array(9).fill(0);
        for (let i = 0; i < strats.length; i++) {
            data.strat = strats[i];
            let sim = yield singleSim(data);
            if (bestSim[7] < sim[7])
                bestSim = sim;
        }
        return bestSim;
    });
}
function getStrats(theory, rho, type) {
    let conditions = [];
    switch (theory) {
        case "T1":
            conditions = [
                rho < 25,
                type !== "Best Overall" && type !== "Best Active" && rho >= 25 && rho < 850,
                type !== "Best Overall" && type !== "Best Active" && rho > 625,
                type !== "Best Semi-Idle" && type !== "Best Idle" && (type === "Best Active" || rho < 250),
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" //T1SolarXLII
            ];
            break;
        case "T2":
            conditions = [
                (type !== "Best Semi-Idle" && type !== "Best Active" && type !== "Best Overall") || rho < 25,
                type !== "Best Idle" && ((type !== "Best Active" && type !== "Best Overall") || rho >= 250),
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 250,
                type !== "Best Active" && type !== "Best Overall" && type !== "Best Idle" && rho < 250 //T2qs
            ];
            break;
        case "T3":
            conditions = [
                rho < 25,
                type !== "Best Overall" && type !== "Best Active" && rho < 150,
                type !== "Best Overall" && type !== "Best Active" && type !== "Best Semi-Idle" && rho >= 175 && rho < 300,
                type !== "Best Overall" && type !== "Best Active" && rho >= 100 && rho < 175,
                type !== "Best Overall" && type !== "Best Active" && type !== "Best Semi-Idle" && rho >= 175 && rho < 300,
                type !== "Best Overall" && type !== "Best Active" && rho >= 260 && (rho < 500 || type !== "Best Semi-Idle"),
                type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle" && rho >= 150,
                type !== "Best Overall" && type !== "Best Idle" && type !== "Best Semi-Idle" && rho >= 275,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 150,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 350,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 350,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 175,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 150 && rho < 225,
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" && rho >= 200 && rho < 375,
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" && rho >= 250 //T3Play2
            ];
            break;
        case "T4":
            conditions = [
                rho < 30,
                type !== "Best Overall" && type !== "Best Active" && rho < 600 && cache.lastStrat !== "T4C3",
                type !== "Best Overall" && type !== "Best Active" && rho > 200,
                type !== "Best Overall" && type !== "Best Active" && rho < 125,
                type !== "Best Overall" && type !== "Best Active" && rho < 150,
                type !== "Best Overall" && type !== "Best Active" && rho < 275,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 700 && cache.lastStrat !== "T4C3d66" && cache.lastStrat !== "T4C123d",
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 700 && rho > 175 && (cache.lastStrat !== "T4C3d66" || rho < 225),
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 75 && rho < 200,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 175 && rho < 300,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 275,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho > 240 //T4C3d66
            ];
            break;
        case "T5":
            conditions = [
                rho < 25 || (type !== "Best Overall" && type !== "Best Active" && type !== "Best Semi-Idle"),
                type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle",
                type !== "Best Idle" && type !== "Best Semi-Idle" //T5AI2
            ];
            break;
        case "T6":
            conditions = [
                rho < 25,
                type !== "Best Overall" && type !== "Best Active" && rho < 25,
                type !== "Best Overall" && type !== "Best Active" && rho >= 25 && rho < 100,
                type !== "Best Overall" && type !== "Best Active" && rho >= 100 && rho < 1100 && cache.lastStrat !== "T6noC1234",
                type !== "Best Overall" && type !== "Best Active" && rho >= 100 && rho < 750 && cache.lastStrat !== "T6noC34" && cache.lastStrat !== "T6noC1234",
                type !== "Best Overall" && type !== "Best Active" && rho > 800,
                type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle" && rho > 400,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 25,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 25 && rho < 100,
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Overall" && rho >= 100 && rho < 1100 && cache.lastStrat !== "T6noC1234",
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Overall" && rho >= 100 && rho < 750 && cache.lastStrat !== "T6noC34" && cache.lastStrat !== "T6noC1234",
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Overall" && rho > 800,
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" && rho >= 100 //T6AI
            ];
            break;
        case "T7":
            conditions = [
                false,
                type !== "Best Overall" && type !== "Best Active" && (rho < 25 || (rho >= 75 && rho < 100)),
                type !== "Best Overall" && type !== "Best Active" && rho >= 25 && rho < 75,
                type !== "Best Overall" && type !== "Best Active" && rho < 550 && rho >= 100,
                type !== "Best Overall" && type !== "Best Active" && rho < 625 && rho > 500,
                type !== "Best Overall" && type !== "Best Active" && rho > 525,
                type !== "Best Semi-Idle" && type !== "Best Idle" && (rho < 25 || (rho >= 75 && rho < 150)),
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 25 && rho < 75,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 100 //T7PlaySpqcey
            ];
            break;
        case "T8":
            conditions = [
                type !== "Best Overall" && type !== "Best Active" && (type !== "Best Semi-Idle" || rho < 100),
                type !== "Best Overall" && type !== "Best Active" && rho < 25,
                type !== "Best Overall" && type !== "Best Active" && rho >= 160 && rho < 220,
                type !== "Best Overall" && type !== "Best Active" && rho >= 100 && rho < 160,
                type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle",
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 60,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 160 && rho < 220,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 100 && rho < 160,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 40 && rho < 100,
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Overall" && rho >= 220,
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" //T8PlaySolarswap
            ];
            break;
        case "WSP":
            conditions = [
                type !== "Best Overall" && type !== "Best Active" && rho < 525,
                type !== "Best Overall" && type !== "Best Active" && rho > 475,
                type !== "Best Semi-Idle" && type !== "Best Idle" //WSPdstopC1
            ];
            break;
        case "SL":
            conditions = [
                rho < 25 || type === "Best Idle",
                type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle" && rho >= 300,
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho >= 300,
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Overall" && rho < 300,
                type !== "Best Semi-Idle" && type !== "Best Idle" && type !== "Best Active" && rho < 300 //SLMSd
            ];
            break;
        case "EF":
            conditions = [
                rho < 10 || type === "Best Idle",
                type !== "Best Overall" && type !== "Best Active" && type !== "Best Idle",
                type !== "Best Semi-Idle" && type !== "Best Idle" && rho < 10,
                type !== "Best Semi-Idle" && type !== "Best Idle" //EFAI
            ];
            break;
        case "CSR2":
            conditions = [
                rho < 10 || type === "Best Idle" || type === "Best Semi-Idle",
                type === "Best Active" && rho < 500,
                (type === "Best Overall" || (type === "Best Active" && rho >= 500)) && rho > 10 //CSR2XL
            ];
            break;
    }
    let requirements = [];
    switch (theory) {
        case "T1":
            requirements = [
                true,
                rho >= 25,
                rho >= 50,
                true,
                true //T1SolarXLII
            ];
            break;
        case "T2":
            requirements = [
                true,
                true,
                true,
                true //T2qs
            ];
            break;
        case "T3":
            requirements = [
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true //T3Play2
            ];
            break;
        case "T4":
            requirements = [
                true,
                true,
                true,
                rho >= 25,
                rho >= 50,
                rho >= 50,
                true,
                true,
                rho >= 25,
                rho >= 75,
                rho >= 50,
                true //T4C3d66
            ];
            break;
        case "T5":
            requirements = [
                true,
                true,
                true //T5AI2
            ];
            break;
        case "T6":
            requirements = [
                true,
                true,
                true,
                true,
                true,
                rho >= 125,
                true,
                true,
                true,
                true,
                true,
                rho >= 125,
                true //T6AI
            ];
            break;
        case "T7":
            requirements = [
                true,
                true,
                rho >= 25,
                rho >= 25,
                rho >= 75,
                rho >= 75,
                true,
                rho >= 25,
                rho >= 100 //T7PlaySpqcey
            ];
            break;
        case "T8":
            requirements = [
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true,
                true //T8PlaySolarswap
            ];
            break;
        case "WSP":
            requirements = [
                true,
                true,
                true //WSPdstopC1
            ];
            break;
        case "SL":
            requirements = [
                true,
                true,
                true,
                true,
                true //SLMSd
            ];
            break;
        case "EF":
            requirements = [
                true,
                true,
                true,
                true //EFAI
            ];
            break;
        case "CSR2":
            requirements = [
                true,
                true,
                true //CSR2XL
            ];
            break;
    }
    if (conditions.length === 0)
        throw "No strats found";
    let res = [];
    for (let i = 0; i < conditions.length; i++)
        if ((conditions[i] || !global.stratFilter) && requirements[i])
            res.push(jsonData.strats[getIndexFromTheory(theory)][i]);
    return res;
}
