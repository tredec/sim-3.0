import jsonData from "../Data/data.json" assert { type: "json" };
export const qs = (name) => document.querySelector(name);
export const qsa = (name) => document.querySelectorAll(name);
export const ce = (type) => document.createElement(type);
export const event = (element, eventType, callback) => element.addEventListener(eventType, (e) => callback(e));
export function findIndex(arr, val) {
    for (let i = 0; i < arr.length; i++)
        if (val === arr[i])
            return i;
    return -1;
}
export function sleep(time = 0) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
export function getIndexFromTheory(theory) {
    return findIndex(jsonData.theories, theory);
}
export function getTauFactor(theory) {
    switch (theory) {
        case "T1":
        case "T2":
        case "T3":
        case "T4":
        case "T5":
        case "T6":
        case "T7":
        case "T8":
            return 1;
        case "WSP":
        case "SL":
        case "CSR2":
        case "RZ":
            return 0.1;
        case "EF":
            return 0.4;
        case "FP":
            return 0.075;
    }
    throw `Invalid theory ${theory}. Please contact the author of the sim.`;
}
export function getTheoryFromIndex(index) {
    return jsonData.theories[index];
}
export function log10(num) {
    const split = String(num).split("e");
    const result = Number(split[1]) + Math.log10(Math.max(1, Number(split[0])));
    return Number(result);
}
export function logToExp(num, dec = 3) {
    const wholePart = Math.floor(num);
    const fractionalPart = num - wholePart;
    const frac1 = round(Math.pow(10, fractionalPart), dec);
    return (frac1 >= 10 ? frac1 / 10 : frac1) + "e" + (frac1 >= 10 ? wholePart + 1 : wholePart);
}
export function convertTime(secs) {
    let mins = Math.floor((secs / 60) % 60);
    let hrs = Math.floor((secs / 3600) % 24);
    let days = Math.floor((secs / 86400) % 365);
    let years = Math.floor(secs / 31536000);
    let result = "";
    if (years > 0) {
        result += years < 1e6 ? years : logToExp(Math.log10(years));
        result += "y";
    }
    if (days > 0)
        result += days + "d";
    result += (hrs < 10 ? "0" : "") + hrs + "h";
    if (years === 0)
        result += (mins < 10 ? "0" : "") + mins + "m";
    return result;
}
export function formatNumber(value, precision = 6) {
    return value.toPrecision(precision).replace(/[+]/, "");
    // if (value >= 1e6) return logToExp(Math.log10(value), 3);
    // const l: number = Math.floor(Math.log10(Math.abs(value)));
    // let num = round(value, precision - l).toString();
    // while (num.split(".")[1]?.length < precision - l) num += "0";
    // return num;
}
export function round(number, decimals) {
    return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
export function add(value1, value2) {
    const max = value1 > value2 ? value1 : value2;
    const min = value1 > value2 ? value2 : value1;
    const wholePart1 = Math.floor(max);
    const fractionalPart1 = Math.pow(10, (max - wholePart1));
    const wholePart2 = Math.floor(min);
    const fractionalPart2 = Math.pow(10, (min - wholePart2));
    return wholePart1 + Math.log10(fractionalPart1 + fractionalPart2 / Math.pow(10, (wholePart1 - wholePart2)));
}
export function subtract(value1, value2) {
    const max = value1 > value2 ? value1 : value2;
    const min = value1 > value2 ? value2 : value1;
    const wholePart1 = Math.floor(max);
    const fractionalPart1 = Math.pow(10, (max - wholePart1));
    const wholePart2 = Math.floor(min);
    const fractionalPart2 = Math.pow(10, (min - wholePart2));
    return wholePart1 + Math.log10(fractionalPart1 - fractionalPart2 / Math.pow(10, (wholePart1 - wholePart2)));
}
export function l10(val) {
    return Math.log10(val);
}
export function l2(val) {
    return Math.log2(val);
}
export const ZERO = (() => {
    let r = Math.random();
    //dont ask pls ik this is dumb
    while (r === 0)
        r = Math.random();
    return r;
})();
export function createResult(data, stratExtra) {
    return [
        data.theory,
        data.sigma,
        logToExp(data.lastPub, 2),
        logToExp(data.pubRho, 2),
        logToExp((data.pubRho - data.lastPub) * getTauFactor(data.theory), 2),
        formatNumber(data.pubMulti),
        data.strat + stratExtra,
        data.maxTauH === 0 ? 0 : Number(formatNumber(data.maxTauH * getTauFactor(data.theory))),
        convertTime(Math.max(0, data.pubT - data.recovery.time)),
        [data.pubRho, data.recovery.recoveryTime ? data.recovery.time : Math.max(0, data.pubT - data.recovery.time)]
    ];
}
