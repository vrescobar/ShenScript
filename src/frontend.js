// TODO: need to be able to provide definition for (y-or-n?) maybe in frontend?
// TODO: have shen-script.*instream-supported*, shen-script.*outstream-supported*, shen-script.*async* flags?
// TODO: js. namespace functions

const top = typeof window !== 'undefined' ? window : global;
const mapAsync = async (ps, f) => {
  let y = [];
  for (const p of ps) {
    y.push(await f(await p));
  }
  return y;
};
const last = a => a.length === 0 ? null : a[a.length - 1];
const boundAccess = (x, name) => {
  const y = x[name];
  return typeof y === 'function' ? y.bind(x) : y;
};

module.exports = $ => {
  const { asCons, asSymbol, async, consToArray, f, fun, future, nameOf, primitives, raise, settle } = $;
  const run = async ? future : settle;
  const parse = source => run(f['read-from-string'](source));
  const caller = name => (...args) => run(f[name](...args));
  const define = (name, fn) => f[name] = fun(fn);
  const evalShen = expr => run(f.eval(expr));
  const execEach = async
    ? async source => mapAsync(consToArray(await parse(source)), evalShen)
    :       source => consToArray(parse(source)).map(evalShen);
  const exec = async
    ? async source => last(await execEach(source))
    :       source => last(execEach(source));
  const inline = (name, fn) => primitives[name] = fn;
  define('js.new', (className, args) => new (top[nameOf(asSymbol(className))])(...consToArray(asCons(args))));
  define('js.obj', values => {
    const array = consToArray(asCons(values));
    if (array.length % 2 !== 0) {
      raise('js.obj must take an even-length key-value list');
    }
    const pairs = [];
    for (let i = 0; i < array.length; i += 2) {
      pairs.push(array.slice(i, i + 2));
    }
    return pairs.reduce((obj, [name, value]) => (obj[name] = value, obj), {});
  });
  const dot = (object, property) => boundAccess(object, nameOf(asSymbol(property)));
  define('.', dot);
  define('..', (object, properties) => consToArray(properties).reduce(dot, object));
  return Object.assign($, { caller, define, evalShen, exec, execEach, inline, parse });
};
