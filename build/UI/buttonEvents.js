import { qs, event } from "../Utils/helperFunctions.js";
//Buttons
const clear = qs(".clear");
const copyImage = qs(".imageC");
const downloadImage = qs(".imageD");
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
event(downloadImage, "pointerdown", () => createImage("download"));
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
const saveDist = qs(".saveDist");
const getDist = qs(".getDist");
const modeInput = qs("textarea");
event(saveDist, "pointerdown", () => {
    if (modeInput.value.replace(" ", "").length === 0)
        return;
    saveDist.classList.add("animate");
    setTimeout(() => saveDist.classList.remove("animate"), 550);
    localStorage.setItem("savedDistribution", modeInput.value);
});
event(getDist, "pointerdown", () => {
    var _a;
    modeInput.value = (_a = localStorage.getItem("savedDistribution")) !== null && _a !== void 0 ? _a : modeInput.value;
});
