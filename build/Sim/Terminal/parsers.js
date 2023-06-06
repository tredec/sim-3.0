import jsonData from ".././data.json" assert { type: "json" };
export function parseSimParams(params) {
    if (params.length < 3)
        throw "At least 3 parameters [strat, sigma, start rho] required.";
    params = params.map((elem) => elem.replace(/ /g, ""));
    const data = {
        theory: "",
        strat: "",
        sigma: "",
        rho: "",
        cap: "",
        mode: "Single sim",
        modeInput: "",
        simAllInputs: [true, true],
        timeDiffInputs: [],
        hardCap: false
    };
    const s01 = params[0].slice(0, 2);
    const s2e = params[0].slice(2, params[0].length);
    if (["bo", "ba", "bs", "bi"].findIndex((i) => i === s01) !== -1) {
        data.theory = /[1-8]/.test(s2e) ? jsonData.theories[parseInt(s2e) - 1] : s2e.toUpperCase();
        switch (s01.toLowerCase()) {
            case "bo":
                data.strat = "Best Overall";
                break;
            case "ba":
                data.strat = "Best Active";
                break;
            case "bs":
                data.strat = "best Semi-Idle";
                break;
            case "bi":
                data.strat = "Best Idle";
                break;
        }
    }
    else {
        let index = -1;
        for (let i = 0; i < jsonData.theories.length; i++) {
            if (new RegExp(jsonData.theories[i]).test(params[0].toUpperCase())) {
                data.theory = jsonData.theories[i];
                index = i;
            }
        }
        for (let i = 0; i < jsonData.strats[index].length; i++)
            if (params[0].toLowerCase() === jsonData.strats[index][i].toLowerCase())
                data.strat = jsonData.strats[index][i];
    }
    data.sigma = params[1];
    if (/[+=]/.test(params[2])) {
        const split = params[2].split("+=");
        data.rho = split[0];
        data.modeInput = split[1];
        data.mode = "Steps";
    }
    else
        data.rho = params[2];
    if (params.length > 3 && params[3].length !== 0) {
        data.cap = params[3];
        data.mode = data.mode === "Single sim" ? "Chain" : data.mode;
    }
    return data;
}
