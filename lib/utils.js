const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const GeneratorFunction = Object.getPrototypeOf(function*() {}).constructor;

const flatMap = (xs, f) => {
  const ys = [];
  for (const x of xs) {
    for (const y of f(x)) {
      ys.push(y);
    }
  }
  return ys;
};
const butLast = a => a.length === 0 ? [] : a.slice(0, a.length - 1);
const last = a => a.length === 0 ? undefined : a[a.length - 1];
const mapAsync = async (xs, f) => {
  const ys = [];
  for (const x of xs) {
    ys.push(await f(await x));
  }
  return ys;
};
const multiMatch = (key, ...pairs) => {
  for (const [regex, result] of pairs) {
    if (regex.test(key)) {
      return result;
    }
  }
  return 'Unknown';
};
const pairs = (xs, message = 'array must be of even length') =>
  xs.length % 2 === 0
    ? produce(x => x.length > 0, x => x.slice(0, 2), x => x.slice(2), xs)
    : raise(message);
const produceState = (proceed, select, next, state, result = []) => {
  for (; proceed(state); state = next(state)) {
    result.push(select(state));
  }
  return { result, state };
};
const produce = (proceed, select, next, state, result = []) =>
  produceState(proceed, select, next, state, result).result;
const raise = x => { throw new Error(x); };
const s = (x, y) => Symbol.for(String.raw(x, y));

module.exports = {
  AsyncFunction, GeneratorFunction,
  butLast, flatMap, last, mapAsync, multiMatch, pairs, produce, produceState, raise, s
};
