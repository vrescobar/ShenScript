function getOperatingSystem() {
    if (navigator) {
        if (navigator.platform.toLowerCase() === 'win32') return "Windows";
        if (navigator.appVersion.indexOf("Win") != -1) return "Windows";
        if (navigator.appVersion.indexOf("Mac") != -1) return "macOS";
        if (navigator.appVersion.indexOf("iPhone") != -1) return "iOS";
        if (navigator.appVersion.indexOf("iPad") != -1) return "iOS";
        if (navigator.appVersion.indexOf("iOS") != -1) return "iOS";
        if (navigator.appVersion.indexOf("Linux") != -1) return "Linux";
        if (navigator.appVersion.indexOf("Android") != -1) return "Android";
        if (navigator.appVersion.indexOf("X11") != -1) return "Unix";
    }
    if (process) {
        if (process.platform === 'win32') return 'Windows';
        if (process.platform === 'darwin') return 'macOS';
        if (process.platform === 'linux') return 'Linux';
    }
    return "Unknown";
}
function getImplementation() {
    if (window) {
        if (navigator.appVersion.indexOf('Edge') != -1) return 'Edge';
        if (navigator.appVersion.indexOf('Trident') != -1) return 'Internet Explorer';
        if (navigator.appVersion.indexOf('Chrome') != -1) return 'Chrome';
        if (navigator.appVersion.indexOf('Opera') != -1) return 'Opera';
        if (navigator.appVersion.indexOf('Firefox') != -1) return 'Firefox';
        if (navigator.appVersion.indexOf('Safari') != -1) return 'Safari';
        if (navigator.appVersion.indexOf('Vivaldi') != -1) return 'Vivaldi';
        if (navigator.appVersion.indexOf('Android') != -1) return 'Android';
    }
    if (process) {
        return 'Node.js';
    }
    return "Unknown";
}
function getRelease() {
    if (window) {
        var ua = navigator.userAgent,
            tem,
            M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
            return (tem[1] || '');
        }
        if (M[1] === 'Chrome'){
            tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
            if (tem != null) return tem[2];
        }
        M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
        if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
        return M[1];
    }
    if (process) {
        return process.version.slice(1);
    }
    return "Unknown";
}
function skipWhitespace(state) {
    while (!isDone(state) && /\s/.test(current(state))) {
        skip(state);
    }
}
function current(state) { return state.text[state.pos]; }
function isDone(state) { return state.pos >= state.text.length; }
function skip(state) { state.pos++; }
function isDigitOrSign(ch) {
    return /[\d]/.test(ch);
}
function isSymbolChar(ch) {
    return /\S/.test(ch) && ch !== '(' && ch !== ')';
}
function readString(state) {
    skip(state);
    var start = state.pos;
    while (current(state) !== '"') {
        if (isDone(state)) {
            throw new Error('unexpected end of input');
        }
        skip(state);
    }
    var end = state.pos;
    skip(state);
    return state.text.substring(start, end);
}
function readNumber(state) {
    var start = state.pos;
    while (isDigitOrSign(current(state))) {
        if (isDone(state)) {
            throw new Error('unexpected end of input');
        }
        skip(state);
    }
    var end = state.pos;
    return parseFloat(state.text.substring(start, end));
}
function readSymbol(state) {
    var start = state.pos;
    while (isSymbolChar(current(state))) {
        if (isDone(state)) {
            throw new Error('unexpected end of input');
        }
        skip(state);
    }
    var end = state.pos;
    return new Sym(state.text.substring(start, end));
}
function arrayToCons(x) {
    var result = null;
    for (var i = x.length - 1; i >= 0; i--) result = new Cons(x[i], result);
    return result;
}
function consToArray(x, array) {
    if (!array) array = [];
    if (isCons(x)) {
        array.push(x.hd);
        return consToArray(x.tl, array);
    }
    if (x !== null) {
        throw new Error('not a valid list');
    }
    return array;
}
function consLength(x) {
    var length = 0;
    while (isCons(x)) {
        x = x.tl;
        length++;
    }
    if (x !== null) {
        throw new Error('not a valid list');
    }
    return length;
}
function parse(state) {
    skipWhitespace(state);
    if (isDone(state)) {
        throw new Error('unexpected end of input');
    }
    if (current(state) === '(') {
        skip(state);
        var child = parse(state), children = [];
        while (child !== undefined) {
            children.push(child);
            child = parse(state);
        }
        return arrayToCons(children);
    }
    if (current(state) === ')') {
        skip(state);
        return undefined;
    }
    if (current(state) === '"') {
        return readString(state);
    }
    if (isDigitOrSign(current(state))) {
        return readNumber(state);
    }
    return readSymbol(state);
}
function State(text) {
    this.text = text;
    this.pos = 0;
}
function Context() {
    this.locals = [];
    this.unique = {};
    this.scopeName = null;
    this.pushLocal = function (name) {
        context = new Context();
        context.locals = this.locals.slice(0);
        context.locals.push(name);
        context.unique = this.unique; // TODO: copy
        context.scopeName = this.scopeName;
        return context;
    };
    this.putLocals = function (names, scopeName) {
        context = new Context();
        context.locals = names.slice(0);
        context.unique = this.unique; // TODO: copy
        context.scopeName = scopeName || null;
        return context;
    }
}
class Thunk {
    constructor(run) {
        this.run = run;
    }
}
class Sym {
    constructor(name) {
        this.name = name;
    }
}
class Cons {
    constructor(hd, tl) {
        this.hd = hd;
        this.tl = tl;
    }
}
isSymbol   = x => x && x.constructor === Sym;
isCons     = x => x && x.constructor === Cons;
isArray    = x => x && x.constructor === Array;
isError    = x => x && x.constructor === Error;
isNumber   = x => typeof x === 'number';
isString   = x => typeof x === 'string';
isFunction = x => typeof x === 'function';
// TODO: isStream = x => x && x.constructor === Stream;
// streams have identity equality
// toStr(x: Stream) => `<Stream ${name/path/url}>`
function eq(x, y) {
    if (x === y) return true;
    if (isSymbol(x) && isSymbol(y)) return x.name === y.name;
    if (isCons(x) && isCons(y)) return eq(x.hd, y.hd) && eq(x.tl, y.tl);
    if (isArray(x) && isArray(y)) {
        if (x.length !== y.length) return false;
        for (var i = 0; i < x.length; ++i) {
            if (!eq(x[i], y[i])) return false;
        }
        return true;
    }
    return false;
}
function toStr(x) {
    if (x === null) return '[]';
    if (isSymbol(x)) return x.name;
    if (isString(x)) return `"${x}"`;
    if (isCons(x)) return `[${consToArray(x).map(toStr).join(' ')}]`;
    if (isFunction(x)) return `<Function ${x.name}>`;
    if (isArray(x)) return `<Vector ${x.length}>`;
    if (isError(x)) return `<Error "${x.message}">`;
    return '' + x;
}
function asJsBool(x) {
    if (isSymbol(x)) {
        if (x.name === 'true') return true;
        if (x.name === 'false') return false;
    }
    throw new Error('not a boolean');
}
function asKlBool(x) {
    return x ? new Sym('true') : new Sym('false');
}
function asKlNumber(x) {
    if (isNumber(x)) {
        return x;
    }
    throw new Error('not a number');
}
function asKlString(x) {
    if (isString(x)) {
        return x;
    }
    throw new Error('not a string');
}
function asKlError(x) {
    if (isError(x)) {
        return x;
    }
    throw new Error('not an error');
}
function asKlValue(x) {
    if (x === true) return new Sym('true');
    if (x === false) return new Sym('false');
    if (isString(x) || isNumber(x) || isSymbol(x) || isCons(x)) return x;
    return x || null;
}
function nameKlToJs(name) {
    var result = "";
    for (var i = 0; i < name.length; ++i) {
        switch (name[i]) {
            case '$': { result += '$do'; break; }
            case '+': { result += "$pl"; break; }
            case '-': { result += "$mi"; break; }
            case '*': { result += "$st"; break; }
            case '/': { result += "$sl"; break; }
            case '<': { result += "$lt"; break; }
            case '>': { result += "$gt"; break; }
            case '=': { result += "$eq"; break; }
            case '?': { result += "$qu"; break; }
            default:  { result += name[i]; break; }
        }
    }
    return result;
}
function nameJsToKl(name) {
    var result = "";
    for (var i = 0; i < name.length;) {
        switch (name.slice(i, i + 3)) {
            case '$do': { result += '$'; i += 3; break; }
            case '$pl': { result += '+'; i += 3; break; }
            case '$mi': { result += '-'; i += 3; break; }
            case '$st': { result += '*'; i += 3; break; }
            case '$sl': { result += '/'; i += 3; break; }
            case '$lt': { result += '<'; i += 3; break; }
            case '$gt': { result += '>'; i += 3; break; }
            case '$eq': { result += '='; i += 3; break; }
            case '$qu': { result += '?'; i += 3; break; }
            default:  { result += name[i]; i++; break; }
        }
    }
    return result;
}
function ifExpr(condition, consequent, alternative) {
    return `asJsBool(${condition})?(${consequent}):(${alternative})`;
}
concatAll = lists => lists.reduce((x, y) => x.concat(y), []);
function flattenDo(expr) {
    if (isCons(expr) && isSymbol(expr.hd) && expr.hd.name === 'do') {
        return concatAll(consToArray(expr.tl).map(flattenDo));
    }
    return [expr];
}
// Value{Num, Str, Sym, Cons} -> JsString
function translate(code, context) {
    if (!context) context = new Context();
    if (code === null) return 'null';
    if (isNumber(code)) return '' + code;
    if (isString(code)) return `"${code}"`;
    if (isSymbol(code)) {
        if (context.locals.includes(code.name)) {
            return nameKlToJs(code.name);
        }
        return `new Sym("${code.name}")`;
    }
    if (consLength(code) === 3 && eq(code.hd, new Sym('and'))) {
        var left = translate(code.tl.hd, context);
        var right = translate(code.tl.tl.hd, context);
        return `asKlBool(asJsBool(${left}) && asJsBool(${right}))`;
    }
    if (consLength(code) === 3 && eq(code.hd, new Sym('or'))) {
        var left = translate(code.tl.hd, context);
        var right = translate(code.tl.tl.hd, context);
        return `asKlBool(asJsBool(${left}) || asJsBool(${right}))`;
    }
    if (eq(code.hd, new Sym('cond'))) {
        function condRecur(code) {
            if (code === null) {
                return `kl.fns.${nameKlToJs('simple-error')}("No clause was true")`;
            } else {
                return ifExpr(
                    translate(code.hd.hd, context),
                    translate(code.hd.tl.hd, context),
                    condRecur(code.tl));
            }
        }
        return condRecur(code.tl);
    }
    if (consLength(code) === 4 && eq(code.hd, new Sym('if'))) {
        return ifExpr(
            translate(code.tl.hd, context),
            translate(code.tl.tl.hd, context),
            translate(code.tl.tl.tl.hd, context));
    }
    if (consLength(code) === 4 && eq(code.hd, new Sym('let'))) {
        // TODO: improve scoping on let bindings
        //       a new function scope isn't necessary for unique variables

        // TODO: flatten immeditaley nested let's into a single iife
        var varName = code.tl.hd.name;
        var value = translate(code.tl.tl.hd, context);
        var body = translate(code.tl.tl.tl.hd, context.pushLocal(varName));
        return `(function () {
                  var ${nameKlToJs(varName)} = ${value};
                  return ${body};
                })()`;
    }
    if (consLength(code) === 4 && eq(code.hd, new Sym('defun'))) {
        var defunName = code.tl.hd.name;
        var paramNames = consToArray(code.tl.tl.hd).map((expr) => expr.name);
        var body = translate(code.tl.tl.tl.hd, context.putLocals(paramNames, defunName));
        return `kl.fns.${nameKlToJs(defunName)} = function (${paramNames.map(nameKlToJs).join()}) {
                  return ${body};
                }`;
    }
    if (consLength(code) === 3 && eq(code.hd, new Sym('lambda'))) {
        var param = nameKlToJs(code.tl.hd.name);
        var body = translate(code.tl.tl.hd, context.putLocals([code.tl.hd.name]));
        return `function (${param}) {
                  return ${body};
                }`;
    }
    if (consLength(code) === 2 && eq(code.hd, new Sym('freeze'))) {
        var body = translate(code.tl.hd);
        return `function () {
                  return ${body};
                }`;
    }
    if (consLength(code) === 3 && eq(code.hd, new Sym('trap-error'))) {
        var body = translate(code.tl.hd, context);
        var handler = translate(code.tl.tl.hd, context);
        return `(function () {
                  try {
                    return ${body};
                  } catch ($err) {
                    return ${handler}($err);
                  }
                })()`;
    }
    if (eq(code.hd, new Sym('do'))) {
        var statements = flattenDo(code).map(expr => translate(expr, context));
        var butLastStatements = statements.slice(0, statements.length - 1).join(';\n');
        var lastStatement = statements[statements.length - 1];
        return `(function () {
                  ${butLastStatements};
                  return ${lastStatement};
                })()`;
    }

    var translatedArgs = consToArray(code.tl).map((expr) => translate(expr, context)).join();

    if (isSymbol(code.hd)) {

        // JS-injection form
        if (code.hd.name === 'js.') {
            if (consLength(code.length) === 1) {
                return 'null';
            }
            var statements = consToArray(code.tl);
            var butLastStatements = statements.slice(0, statements.length - 1).join(';\n');
            var lastStatement = statements[statements.length - 1];
            return `(function () {
                      ${butLastStatements};
                      return asKlValue(${lastStatement});
                    })()`;
        }

        // JS-namespace function call
        if (code.hd.name.indexOf('js.') === 0) {
            var name = code.hd.name.slice(3);
            return `${name}(${translatedArgs})`;
        }

        // KL function call
        var name = nameKlToJs(code.hd.name);
        if (context.locals.includes(code.hd.name)) {
            return `${name}(${translatedArgs})`;
        } else {
            return `kl.fns.${name}(${translatedArgs})`;
        }
    }

    // Application of function value
    var f = translate(code.hd, context);
    return `(${f})(${translatedArgs})`;
}
kl = {
    startTime: new Date().getTime(),
    uniqueSuffix: 0,
    symbols: {},
    fns: {}
};
kl.symbols[nameKlToJs('*language*')] = 'JavaScript';
kl.symbols[nameKlToJs('*implementation*')] = getImplementation();
kl.symbols[nameKlToJs('*release*')] = getRelease();
kl.symbols[nameKlToJs('*os*')] = getOperatingSystem();
kl.symbols[nameKlToJs('*port*')] = '0.1';
kl.symbols[nameKlToJs('*porters*')] = 'Robert Koeninger';
kl.symbols[nameKlToJs('*stinput*')] = ''; // TODO: console
kl.symbols[nameKlToJs('*stoutput*')] = ''; // TODO: console
kl.symbols[nameKlToJs('*sterror*')] = ''; // TODO: console
kl.symbols[nameKlToJs('*home-directory*')] = ''; // TODO: current url
kl.fns[nameKlToJs('if')] = (c, x, y) => asJsBool(c) ? x : y;
kl.fns[nameKlToJs('and')] = (x, y) => asKlBool(asJsBool(x) && asJsBool(y));
kl.fns[nameKlToJs('or')] = (x, y) => asKlBool(asJsBool(x) || asJsBool(y));
kl.fns[nameKlToJs('+')] = (x, y) => asKlNumber(x) + asKlNumber(y);
kl.fns[nameKlToJs('-')] = (x, y) => asKlNumber(x) - asKlNumber(y);
kl.fns[nameKlToJs('*')] = (x, y) => asKlNumber(x) * asKlNumber(y);
kl.fns[nameKlToJs('/')] = (x, y) => asKlNumber(x) / asKlNumber(y);
kl.fns[nameKlToJs('<')] = (x, y) => asKlBool(x < y);
kl.fns[nameKlToJs('>')] = (x, y) => asKlBool(x > y);
kl.fns[nameKlToJs('<=')] = (x, y) => asKlBool(x <= y);
kl.fns[nameKlToJs('>=')] = (x, y) => asKlBool(x >= y);
kl.fns[nameKlToJs('=')] = (x, y) => asKlBool(eq(x, y));
kl.fns[nameKlToJs('number?')] = x => asKlBool(isNumber(x));
kl.fns[nameKlToJs('cons')] = (x, y) => new Cons(x, y);
kl.fns[nameKlToJs('cons?')] = x => asKlBool(isCons(x));
kl.fns[nameKlToJs('hd')] = x => x.hd;
kl.fns[nameKlToJs('tl')] = x => x.tl;
kl.fns[nameKlToJs('set')] = (sym, x) => kl.symbols[nameKlToJs(sym.name)] = x;
kl.fns[nameKlToJs('value')] = sym => kl.symbols[nameKlToJs(sym.name)];
kl.fns[nameKlToJs('intern')] = x => new Sym(asKlString(x));
kl.fns[nameKlToJs('string?')] = x => asKlBool(isString(x));
kl.fns[nameKlToJs('str')] = x => toStr(x);
kl.fns[nameKlToJs('pos')] = (s, x) => s[x];
kl.fns[nameKlToJs('tlstr')] = s => asKlString(s).slice(1);
kl.fns[nameKlToJs('cn')] = (x, y) => asKlString(x) + asKlString(y);
kl.fns[nameKlToJs('string->n')] = x => x.charCodeAt(0);
kl.fns[nameKlToJs('n->string')] = x => String.fromCharCode(x);
kl.fns[nameKlToJs('absvector')] = n => new Array(n).fill(null);
kl.fns[nameKlToJs('<-address')] = (a, i) => a[i];
kl.fns[nameKlToJs('address->')] = (a, i, x) => { a[i] = x; return a; };
kl.fns[nameKlToJs('absvector?')] = a => asKlBool(isArray(a));
kl.fns[nameKlToJs('type')] = (x, _) => x;
kl.fns[nameKlToJs('eval-kl')] = x => eval(translate(x));
kl.fns[nameKlToJs('simple-error')] = x => { throw new Error(asKlString(x)); };
kl.fns[nameKlToJs('error-to-string')] = x => asKlError(x).message;
kl.fns[nameKlToJs('get-time')] = x => {
    if (x.name === 'unix') return new Date().getTime();
    if (x.name === 'run') return new Date().getTime() - kl.startTime;
    throw new Error("get-time only accepts 'unix or 'run");
};
// TODO: open
// TODO: close
// TODO: read-byte
// TODO: write-byte

// TODO: kl name and inline template can be set as properties on function objects
