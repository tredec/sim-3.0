export const qs = (name: string): HTMLElement => document.querySelector(name)!;
export const qsa = (name: string): NodeList => document.querySelectorAll(name)!;
export const ce = (type: string): HTMLElement => document.createElement(type)!;

export const event = (element: HTMLElement, eventType: string, callback: Function): void => element.addEventListener(eventType, () => callback());

export function findIndex(arr: Array<string | number>, val: string | number): number {
  for (let i = 0; i < arr.length; i++) if (val === arr[i]) return i;
  return -1;
}
export function sleep(time: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}
