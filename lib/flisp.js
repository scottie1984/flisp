'use strict'

let R = require('ramda');

let customFunctions = {
    print: x => {
	  console.log(x);
	  return x;
	}
}

let library = R.merge(R, customFunctions);

function Context(scope, parent) {
	let get = identifier => {
		let func;
		if (library[identifier]) {
			func = library[identifier]
		} else {
		  	func = scope[identifier] ? scope[identifier] : parent && parent.get(identifier);
		}
		return func;
	}

	return {
		scope: scope,
		parent: parent,
		get: get
	}
};

var special = {
	'let': function(input, context) {
	  var letContext = input[1].reduce(function(acc, x) {
		acc.scope[x[0].value] = interpret(x[1], context);
		return acc;
	  }, Context({}, context));

	  return interpret(input[2], letContext);
	},

	'lambda': function(input, context) {
	  return function() {
		var lambdaArguments = arguments;
		var lambdaScope = input[1].reduce(function(acc, x, i) {
		  acc[x.value] = lambdaArguments[i];
		  return acc;
		}, {});

		return interpret(input[2], Context(lambdaScope, context));
	  };
	},

	'def': function(input, context) {
	  context.scope[input[1].value] = function() {
		var lambdaArguments = Array.prototype.slice.call(arguments);
		var lambdaScope = input[2].reduce(function(acc, x, i) {
		  acc[x.value] = lambdaArguments[i];
		  return acc;
		}, {});

		return interpret(input[3], Context(lambdaScope, context));
	  };
	  return input[1].value.toUpperCase();
	},

	'if': function(input, context) {
	  return interpret(input[1], context) ?
		interpret(input[2], context) :
		interpret(input[3], context);
	}
};

function interpretList(input, context) {
	  let list = input.map(x => interpret(x, context));
	  return (list[0] instanceof Function) ? list[0].apply(undefined, list.slice(1)) : list
};

let isSpecial = input => input.length > 0 && input[0].value in special;

let interpret = R.curry((input, context) => {
	let condition = R.cond([
		[R.both(R.isArrayLike, isSpecial), input => special[input[0].value](input, context) ],
		[R.isArrayLike, input => interpretList(input, context) ],
		[R.propEq('type', 'identifier'), input => context.get(input.value)],
		[R.T, input => input.value ]
	])
	return condition(input)
});

let isLiteral = input => input[0] === '"' && input.slice(-1) === '"';

let isFloat = R.compose(R.not, isNaN, parseFloat)

let categorize = R.cond([
	[isFloat, input => { return { type:'literal', value: parseFloat(input) } } ],
	[isLiteral, input => { return { type:'literal', value: input.slice(1, -1) } } ],
	[R.T, input => { return { type:'identifier', value: input } } ]
]);

let parenthesize = (list, input) => {
		let token = input.shift();
		return R.cond([
				[R.isNil, () => list.pop()],
				[R.equals('('), () => {
										list.push(parenthesizeList(input));
										return parenthesize(list, input);
									  }],
				[R.equals(')'), R.always(list)],
				[R.T, token => parenthesize(list.concat(categorize(token)), input)]
			])(token)
};

let parenthesizeList = input => {
	return parenthesize([], input)
}

function replaceStrings(array, acc) {
    if (array.length) {
       	acc.push(array[0].replace(/\(/g, ' ( ').replace(/\)/g, ' ) '));

       	if (array[1]) {
       		acc.push(array[1].replace(/ /g, "!whitespace!"));
       	}

       	let tailTail = R.compose(R.tail, R.tail)(array)
       	return replaceStrings(tailTail, acc)
    } else {
    	return acc;
    }
}

function replaceStr(array) {
	return replaceStrings(array, [])
}

let tokenize = R.compose(
	R.map(R.replace(/!whitespace!/g, " ")),
	R.split(/\s+/),
	R.trim,
	R.join('"'),
	replaceStr,
	R.split('"')
)

let parse = R.compose(
	parenthesizeList,
	tokenize
)

let run = input => {
	let context = Context({});
	return R.compose(
	   interpret(R.__, context),
	   parse
	)(input)
}

module.exports = {
    parse,
    interpret,
    run
}
