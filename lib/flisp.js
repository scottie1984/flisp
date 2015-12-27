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
	let get = identifier => scope[identifier] ? scope[identifier] : parent && parent.get(identifier);
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

	'if': function(input, context) {
	  return interpret(input[1], context) ?
		interpret(input[2], context) :
		interpret(input[3], context);
	}
};

function interpretList(input, context) {
	if (input.length > 0 && input[0].value in special) {
	  return special[input[0].value](input, context);
	} else {
	  var list = input.map(function(x) { return interpret(x, context); });
	  if (list[0] instanceof Function) {
		return list[0].apply(undefined, list.slice(1));
	  } else {
		return list;
	  }
	}
};

function interpret(input, context) {
	let condition = R.cond([
		[() => context === undefined, input => interpret(input, Context(library)) ],
		[R.isArrayLike, input => interpretList(input, context) ],
		[R.propEq('type', 'identifier'), input => context.get(input.value)],
		[R.T, input => input.value ]
	])
	return condition(input)
};

function isLiteral(input) {
  return input[0] === '"' && input.slice(-1) === '"'
}

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
				[R.equals(')'), () => list],
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

module.exports = {
    parse,
    interpret
}