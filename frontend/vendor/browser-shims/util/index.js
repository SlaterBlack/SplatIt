exports.TextEncoder = globalThis.TextEncoder;
exports.TextDecoder = globalThis.TextDecoder;
exports.types = {
  isFloat32Array: (value) => value instanceof Float32Array,
  isInt32Array: (value) => value instanceof Int32Array,
  isUint8Array: (value) => value instanceof Uint8Array,
  isUint8ClampedArray: (value) => value instanceof Uint8ClampedArray,
};
