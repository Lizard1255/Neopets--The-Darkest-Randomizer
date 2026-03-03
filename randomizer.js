import { generateMotes, moteList } from "./motes.js";
import { motes, toLittleEndianHex } from "./constructors.js";

function randomize() {
    let output = "";
    const moteTypes = Object.keys(motes);

    for (let mote of moteList) {
        const randomMote = moteTypes[Math.floor(Math.random() * moteTypes.length)];
        const randomMoteData = motes[randomMote];

        mote.value = randomMoteData;
        output += mote.textLine() + "\n";
    }
    return output;
}

function generatePatches(output) {
    const blob = new Blob([output], { type: 'text/plain' });

    const link = document.createElement('a');
    link.download = '934F9081.pnach';

    link.href = window.URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
}

export function runApp() {
    console.log(toLittleEndianHex(2000));
    generateMotes();
    const final = randomize();
    generatePatches(final);
}

window.runApp = runApp