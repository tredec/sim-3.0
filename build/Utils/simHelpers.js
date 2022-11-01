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
    return `${Math.floor(secs / 86400)}d${Math.floor((secs / 3600) % 24)}h${Math.floor((secs / 60) % 60)}m`;
}
export function decimals(val, def = 5) {
    if (val >= 1e6)
        return logToExp(Math.log10(val), 3);
    const l = Math.floor(Math.log10(Math.abs(val)));
    return round(val, def - l);
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
export function arr(i, b) {
    let arr = new Array(i).fill(b);
    let res = [];
    if (!Array.isArray(b))
        return arr;
    for (let i = 0; i < arr.length; i++) {
        if (arr[0][0].constructor === Array) {
            const d2a = arr[0][0][0].constructor === Array;
            if (d2a) {
                res.push(...arr[i]);
            }
            else
                res.push(arr[i]);
        }
        else
            res.push(arr[i]);
    }
    return res;
}
export function l10(val) {
    return Math.log10(val);
}
export const ZERO = Math.random() + 0.000000001;
export function createResult(data, stratExtra) {
    return [
        data.theory,
        data.sigma,
        logToExp(data.lastPub, 2),
        logToExp(data.pubRho, 2),
        logToExp(data.pubRho - data.lastPub, 2),
        decimals(data.pubMulti),
        data.strat + stratExtra,
        decimals(data.maxTauH),
        convertTime(Math.max(0, data.pubT - data.recovery.time)),
        [data.pubRho, data.recovery.recoveryTime ? data.recovery.time : Math.max(0, data.pubT - data.recovery.time)]
    ];
}
