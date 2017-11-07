class Context {
    static fromHead() {
        return new Context().inHead();
    }
    static fromTail() {
        return new Context().inTail();
    }
    constructor() {
        this.locals = [];
        this.scopeName = null;
        this.position = 'head';
    }
    clone() {
        const x = new Context();
        x.locals = this.locals.slice(0);
        x.scopeName = this.scopeName;
        x.position = this.position;
        return x;
    }
    let(name) {
        const context = this.clone();
        context.locals.push(name);
        return context;
    }
    lambda(name) {
        const context = this.clone();
        context.locals.push(name);
        context.position = 'tail';
        return context;
    }
    freeze() {
        const context = this.clone();
        context.position = 'tail';
        return context;
    }
    defun(name, params) {
        const context = this.clone();
        context.locals = params.slice(0);
        context.scopeName = name || null;
        context.position = 'tail';
        return context;
    }
    inHead() {
        const context = this.clone();
        context.position = 'head';
        return context;
    }
    invoke(f, args) {
        return `${this.position === 'head' ? 'Kl.headCall' : 'Kl.tailCall'}(${f}, [${args}])`;
    }
}

function nameKlToJs(name) {
    let result = "";
    for (let i = 0; i < name.length; ++i) {
        switch (name[i]) {
            case '-': { result += '_'; break; }
            case '_': { result += '$un'; break; }
            case '$': { result += '$dl'; break; }
            case '.': { result += '$do'; break; }
            case '+': { result += "$pl"; break; }
            case '*': { result += "$st"; break; }
            case '/': { result += "$sl"; break; }
            case '<': { result += "$lt"; break; }
            case '>': { result += "$gt"; break; }
            case '%': { result += "$pe"; break; }
            case '&': { result += "$am"; break; }
            case '^': { result += "$ca"; break; }
            case '=': { result += "$eq"; break; }
            case '!': { result += "$ex"; break; }
            case '?': { result += "$qu"; break; }
            default:  { result += name[i]; break; }
        }
    }
    return result;
}
let ifExpr = (c, x, y) => `asJsBool(${c})?(${x}):(${y})`;
let concatAll = lists => lists.reduce((x, y) => x.concat(y), []);
let isDoExpr = expr => isCons(expr) && eq(expr.hd, new Sym('do'));
let flattenDo = expr => isDoExpr(expr) ? concatAll(consToArray(expr.tl).map(flattenDo)) : [expr];
let isLetExpr = expr => isCons(expr) && eq(expr.hd, new Sym('let'));

// TODO: track expression types to simplify code

// TODO: use fn.length to do partial application/overapplication

// TODO: convert Statements -> ExpressionContext with
//       `function(){ ${butLastStmts.join(';')}; return ${lastStmt}; }()`

// TODO: convert Expression -> StatementContext with
//       `(${expr});`

// function convertType(typedExpr, targetType) {
//     if (typedExpr.type === 'js.bool' && targetType === 'kl.bool') return {expr: `asKlBool(${typedExpr})`, type: targetType};
//     if (typedExpr.type === 'kl.bool' && targetType === 'js.bool') return {expr: `asJsBool(${typedExpr})`, type: targetType};
//     return expr;
// }

// Value{Num, Str, Sym, Cons} -> JsString
function translate(code, context) {
    if (isArray(code) || isFunction(code) || isError(code) || isStream(code)) {
        err('vectors, functions, errors and streams are not valid syntax');
    }
    if (!context) context = new Context();

    // Literals
    if (code === null) return 'null';
    if (isNumber(code)) return '' + code;
    if (isString(code)) return `"${code}"`;

    // Local variables and idle symbols
    if (isSymbol(code)) {
        if (context.locals.includes(code.name)) {
            return nameKlToJs(code.name);
        }
        return `new Sym("${code.name}")`;
    }

    // Conjunction and disjunction
    if (consLength(code) === 3 && eq(code.hd, new Sym('and'))) {
        const left = translate(code.tl.hd, context.inHead());
        const right = translate(code.tl.tl.hd, context.inHead());
        return `asKlBool(asJsBool(${left}) && asJsBool(${right}))`;
    }
    if (consLength(code) === 3 && eq(code.hd, new Sym('or'))) {
        const left = translate(code.tl.hd, context.inHead());
        const right = translate(code.tl.tl.hd, context.inHead());
        return `asKlBool(asJsBool(${left}) || asJsBool(${right}))`;
    }

    // Conditional evaluation
    if (consLength(code) === 4 && eq(code.hd, new Sym('if'))) {
        return ifExpr(
            translate(code.tl.hd, context.inHead()),
            translate(code.tl.tl.hd, context),
            translate(code.tl.tl.tl.hd, context));
    }
    if (eq(code.hd, new Sym('cond'))) {
        function condRecur(code) {
            if (code === null) {
                return `kl.fns.${nameKlToJs('simple-error')}("No clause was true")`;
            } else {
                return ifExpr(
                    translate(code.hd.hd, context.inHead()),
                    translate(code.hd.tl.hd, context),
                    condRecur(code.tl));
            }
        }
        return condRecur(code.tl);
    }

    // Local variable binding
    if (consLength(code) === 4 && eq(code.hd, new Sym('let'))) {
        const bindings = [];

        while (isLetExpr(code)) {
            const name = code.tl.hd.name;
            bindings.push({
                name,
                value: translate(code.tl.tl.hd, context),
                redefinition: bindings.some(x => x.name === name)
            });
            context = context.let(name);
            code = code.tl.tl.tl.hd;
        }

        let body = `return ${translate(code, context)};`;

        for (let i = bindings.length - 1; i >= 0; --i) {
            body = `const ${nameKlToJs(bindings[i].name)} = ${bindings[i].value};
                    ${body}`;
            if (bindings[i].redefinition) {
                body = `{
                    ${body}
                }`;
            }
        }

        return `(function () {
                  ${body}
                })()`;
    }

    // Global function definition
    if (consLength(code) === 4 && eq(code.hd, new Sym('defun'))) {
        const defunName = code.tl.hd.name;
        const paramNames = consToArray(code.tl.tl.hd).map((expr) => expr.name);
        const arity = paramNames.length;
        const translatedParams = paramNames.map(nameKlToJs).join();
        const body = translate(code.tl.tl.tl.hd, context.defun(defunName, paramNames));
        return `kl.defun('${defunName}', ${arity}, function (${translatedParams}) {
                  return ${body};
                })`;
    }

    // 1-arg anonymous function
    if (consLength(code) === 3 && eq(code.hd, new Sym('lambda'))) {
        const param = nameKlToJs(code.tl.hd.name);
        const body = translate(code.tl.tl.hd, context.lambda(code.tl.hd.name));
        return `function (${param}) {
                  return ${body};
                }`;
    }

    // 0-arg anonymous function
    if (consLength(code) === 2 && eq(code.hd, new Sym('freeze'))) {
        const body = translate(code.tl.hd, context.freeze());
        return `function () {
                  return ${body};
                }`;
    }

    // Error handling
    if (consLength(code) === 3 && eq(code.hd, new Sym('trap-error'))) {
        const body = translate(code.tl.hd, context);
        const handler = translate(code.tl.tl.hd, context);
        return `(function () {
                  try {
                    return ${body};
                  } catch ($err) {
                    return ${handler}($err);
                  }
                })()`;
    }

    // Flattened, sequential, side-effecting expressions
    if (eq(code.hd, new Sym('do'))) {
        const statements = flattenDo(code).map(expr => translate(expr, context));
        const butLastStatements = statements.slice(0, statements.length - 1).join(';\n');
        const lastStatement = statements[statements.length - 1];
        return `(function () {
                  ${butLastStatements};
                  return ${lastStatement};
                })()`;
    }

    // Inlined global symbol assign
    if (consLength(code) === 3 &&
        eq(code.hd, new Sym('set')) &&
        isSymbol(code.tl.hd) &&
        !context.locals.includes(code.tl.hd.name)) {

        return `kl.symbols.${nameKlToJs(code.tl.hd.name)} = ${translate(code.tl.tl.hd, context.inHead())}`;
    }

    // Inlined global symbol retrieve
    if (consLength(code) === 2 &&
        eq(code.hd, new Sym('value')) &&
        isSymbol(code.tl.hd) &&
        !context.locals.includes(code.tl.hd.name) &&
        kl.isSymbolDefined(code.tl.hd.name)) {

        return `kl.symbols.${nameKlToJs(code.tl.hd.name)}`;
    }

    const translatedArgs = consToArray(code.tl).map((expr) => translate(expr, context.inHead())).join();

    if (isSymbol(code.hd)) {

        // JS-injection form
        if (code.hd.name === 'js.') {
            if (consLength(code.length) === 1) {
                return 'null';
            }
            const statements = consToArray(code.tl);
            const butLastStatements = statements.slice(0, statements.length - 1).join(';\n');
            const lastStatement = statements[statements.length - 1];
            return `(function () {
                      ${butLastStatements};
                      return asKlValue(${lastStatement});
                    })()`;
        }

        // JS-namespace function call
        if (code.hd.name.indexOf('js.') === 0) {
            const name = code.hd.name.slice(3);
            return `${name}(${translatedArgs})`;
        }

        // KL function call
        const name = nameKlToJs(code.hd.name);
        if (context.locals.includes(code.hd.name)) {
            return context.invoke(name, translatedArgs);
        } else {
            return context.invoke(`kl.fns.${name}`, translatedArgs);
        }
    }

    // Application of function value
    const f = translate(code.hd, context.inHead());
    return context.invoke(`asKlFunction(${f})`, translatedArgs);
}
