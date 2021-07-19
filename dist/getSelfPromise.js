"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getSelfPromise() {
    let resolveFunc = (() => { });
    let rejectFunc = () => { };
    const p = new Promise((resolve, reject) => {
        resolveFunc = resolve;
        rejectFunc = reject;
    });
    p.resolve = resolveFunc;
    p.reject = rejectFunc;
    return p;
}
exports.default = getSelfPromise;
