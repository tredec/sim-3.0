import { qs, event, ce } from "../Utils/helperFunctions.js";
declare var html2canvas: any;
//Buttons
const clear = qs(".clear");
const copyImage = qs(".imageC");

//Other elements
let tbody: HTMLElement;

const output = qs(".output");

event(clear, "pointerdown", () => {
  tbody = qs("tbody");
  while (tbody.firstChild) tbody.firstChild.remove();
  output.textContent = "";
  console.clear();
});

event(copyImage, "pointerdown", () => createImage(""));

function createImage(mode: string) {
  html2canvas(qs("table")).then((canvas: any) =>
    canvas.toBlob((blob: any) => {
      if (mode === "download") {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "output.png";
        a.click();
      } else {
        navigator.clipboard
          .write([new ClipboardItem(<any>{ "image/png": blob })])
          .then(() => {
            console.log("Sucsessfully created image!");
          })
          .catch(() => console.log("Failed creating image."));
      }
    })
  );
}

const saveDist = qs(".saveDist");
const getDist = qs(".getDist");
const modeInput = <HTMLTextAreaElement>qs("textarea");

event(saveDist, "pointerdown", () => {
  if (modeInput.value.replace(" ", "").length === 0) return;
  saveDist.classList.add("animate");
  setTimeout(() => saveDist.classList.remove("animate"), 550);
  localStorage.setItem("savedDistribution", modeInput.value);
});
event(getDist, "pointerdown", () => {
  modeInput.value = localStorage.getItem("savedDistribution") ?? modeInput.value;
});
