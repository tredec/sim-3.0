import { qs, event } from "../Utils/helperFunctions.js";
//Buttons
const clear = qs(".clear");
const copyImage = qs(".imageC");
//Other elements
let tbody;
const output = qs(".output");
event(clear, "pointerdown", () => {
    tbody = qs("tbody");
    while (tbody.firstChild)
        tbody.firstChild.remove();
    output.textContent = "";
    console.clear();
});
event(copyImage, "pointerdown", () => createImage(""));
function createImage(mode) {
    html2canvas(qs("table")).then((canvas) => canvas.toBlob((blob) => {
        if (mode === "download") {
            const a = document.createElement("a");
            a.href = canvas.toDataURL("image/png");
            a.download = "output.png";
            a.click();
        }
        else {
            navigator.clipboard
                .write([new ClipboardItem({ "image/png": blob })])
                .then(() => {
                console.log("Sucsessfully created image!");
            })
                .catch(() => console.log("Failed creating image."));
        }
    }));
}
