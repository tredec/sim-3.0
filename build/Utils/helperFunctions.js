export const qs = (name) => document.querySelector(name);
export const qsa = (name) => document.querySelectorAll(name);
export const ce = (type) => document.createElement(type);
export const event = (element, eventType, callback) => element.addEventListener(eventType, () => callback());
export function findIndex(arr, val) {
    for (let i = 0; i < arr.length; i++)
        if (val === arr[i])
            return i;
    return -1;
}
export function sleep(time = 0) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
