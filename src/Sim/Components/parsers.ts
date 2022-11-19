import { log10 } from "../../Utils/simHelpers";
import { getTauFactor, getTheoryFromIndex } from "./helpers";
import jsonData from ".././data.json" assert { type: "json" };

export function parseCurrencyValue(value: string | Array<number | string>, theory: string, sigma: number, defaultConv: string = "r"): number {
  if (typeof value === "string") {
    const lastChar: string = value.charAt(value.length - 1);
    //checks if last character is not valid currency character. If not, throw error
    if (lastChar.match(/[r/t/m]/) !== null) {
      value = value.slice(0, -1);
      if (isValidCurrency(value)) value = [value, lastChar];
    } else if (lastChar.match(/[0-9]/)) {
      if (isValidCurrency(value)) value = [value, defaultConv];
    } else {
      throw `Invalid currency value ${value}. Currency value must be in formats <number>, <exxxx> or <xexxxx>.`;
    }
  }
  //Parses currency value if it is still a string.
  if (typeof value[0] === "string" && Array.isArray(value)) value[0] = parseValue(value[0]);
  //failsafe in case value is not parsed currectly.
  if (typeof value[0] !== "number") throw `Cannot parse value ${value[0]}. Please contact the author of the sim.`;
  //returns value if last character is r.
  if (value[1] === "r") return value[0];
  //returns value with correct tau factor if last character is t.
  if (value[1] === "t") return value[0] / getTauFactor(theory);
  //returns value converted to rho from current multiplier if last character is r.
  if (value[1] === "m") return reverseMulti(theory, value[0], sigma);
  throw `Cannot parse value ${value[0]} and ${value[1]}. Please contact the author of the sim.`;
}
export function isValidCurrency(val: string): true {
  //if currency contains any other characters than 0-9 or e, throw error for invalid currency.
  if (val.match(/^[0-9/e/.]+$/) === null) throw `Invalid currency value ${val}. Currency value must be in formats <number>, <exxxx> or <xexxxx>.`;
  //if amount of e's in currency are more than 1, throw error for invalid currency. same for dots
  let es = 0;
  for (let i = 0; i < val.length; i++) if (val[i] === "e") es++;
  if (es > 1) throw `Invalid currency value ${val}. Currency value must be in formats <number>, <exxxx> or <xexxxx>.`;
  let dots = 0;
  for (let i = 0; i < val.length; i++) if (val[i] === ".") dots++;
  if (dots > 1) throw `Invalid currency value ${val}. Currency value must be in formats <number>, <exxxx> or <xexxxx>.`;
  //if currency is valid, return true.
  return true;
}
export function parseValue(val: string): number {
  if (/[e]/.test(val)) return log10(val);
  return parseFloat(val);
}
export function reverseMulti(theory: string, value: number, sigma: number): number {
  let getR9Exp = () => (sigma < 65 ? 0 : sigma < 75 ? 1 : sigma < 85 ? 2 : 3);
  let divSigmaMulti = (exp: number, div: number) => (value - Math.log10((sigma / 20) ** getR9Exp()) + Math.log10(div)) * (1 / exp);
  let multSigmaMulti = (exp: number, mult: number) => (value - Math.log10((sigma / 20) ** getR9Exp()) - Math.log10(mult)) * (1 / exp);
  let sigmaMulti = (exp: number) => (value - Math.log10((sigma / 20) ** getR9Exp())) * (1 / exp);
  switch (theory) {
    case "T1":
      return divSigmaMulti(0.164, 3);
    case "T2":
      return divSigmaMulti(0.198, 100);
    case "T3":
      return multSigmaMulti(0.147, 3);
    case "T4":
      return divSigmaMulti(0.165, 4);
    case "T5":
      return sigmaMulti(0.159);
    case "T6":
      return divSigmaMulti(0.196, 50);
    case "T7":
      return sigmaMulti(0.152);
    case "T8":
      return sigmaMulti(0.15);
    case "WSP":
    case "SL":
      return value / 0.15;
    case "EF":
      return value * (1 / 0.387) * 2.5;
    case "CSR2":
      return (value + Math.log10(200)) * (1 / 2.203) * 10;
  }
  throw `Failed parsing multiplier. Please contact the author of the sim.`;
}
export function parseModeInput(input: string, mode: string): Array<number> | number | string {
  //Parsing Step mode input
  if (mode === "Steps" && typeof input === "string") {
    if (isValidCurrency(input)) return parseValue(input);
  }
  //Parsing Time and Amount input
  if ((mode === "Time" || mode === "Amount") && typeof input === "string") {
    if (input.match(/[0-9]/) !== null) return parseFloat(input);
    throw mode + " input must be a number.";
  }
  //All and Time diff. mode has it's own parser export functions
  if (mode === "All") return parseSimAll(input);
  if (mode === "Time diff." || mode === "Single sim" || mode === "Chain") return input;
  throw `Couldnt parse mode ${mode}. Please contact the author of the sim.`;
}

function parseSimAll(input: string): Array<number> {
  //splitting input at every space
  let split = input.split(" ");
  //removign all leftover spaces and line breaks in every split
  for (let i = 0; i < split.length; i++) {
    split[i] = split[i].replace(" ", "");
    split[i] = split[i].replace("\n", "");
  }
  split = split.filter((elem) => elem !== "");
  //needs at least two items
  if (split.length < 2) throw "Student count and at least one theory value that is not 0 is required.";
  //dont allow more inputs than students + theories
  if (split.length - 1 > jsonData.theories.length) throw `Invalid value ${split[jsonData.theories.length + 1]} does not match any theory.`;
  //parse students
  let res: Array<number> = [];
  if (/^\d+$/.test(split[0])) res.push(parseInt(split[0]));
  else throw `Invalid student value ${split[0]}.`;
  //parse and check if all values are valid
  for (let i = 1; i < split.length; i++) {
    res.push(parseCurrencyValue(split[i], getTheoryFromIndex(i - 1), res[0], "t"));
  }
  return res;
}
