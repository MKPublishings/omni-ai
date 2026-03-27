function info(...args) {
    console.log("[ION-IMAGE-ENGINE]", ...args);
}

function error(...args) {
    console.error("[ION-IMAGE-ENGINE][ERROR]", ...args);
}

module.exports = {
    info,
    error
};
