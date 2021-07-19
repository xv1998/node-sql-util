"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getSelfPromise() {
    var resolveFunc = (function () { });
    var rejectFunc = function () { };
    var p = new Promise(function (resolve, reject) {
        resolveFunc = resolve;
        rejectFunc = reject;
    });
    p.resolve = resolveFunc;
    p.reject = rejectFunc;
    return p;
}
exports.default = getSelfPromise;
