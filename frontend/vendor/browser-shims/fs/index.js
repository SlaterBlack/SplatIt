exports.readFileSync = function () {
  throw new Error('Node filesystem access is unavailable in the browser.');
};
