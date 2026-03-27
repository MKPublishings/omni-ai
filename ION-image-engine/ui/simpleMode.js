const { IONImageGenerate } = require("../index");

async function simpleMode(prompt) {
    return IONImageGenerate(prompt, {
        mode: "simple"
    });
}

module.exports = simpleMode;
