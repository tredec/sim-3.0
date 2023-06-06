import { findIndex } from "../../Utils/helperFunctions.js";
import jsonData from ".././data.json" assert { type: "json" };

export function getIndexFromTheory(theory: string): number {
  return findIndex(jsonData.theories, theory);
}
export function getTauFactor(theory: string): number {
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
export function getTheoryFromIndex(index: number): string {
  return jsonData.theories[index];
}
