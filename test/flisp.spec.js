'use strict'

var t = require("../lib/flisp");

var is = function(input, type) {
  return Object.prototype.toString.call(input) === '[object ' + type + ']';
};

// takes an AST and replaces type annotated nodes with raw values
var unannotate = function(input) {
  if (is(input, 'Array')) {
    if (input[0] === undefined) {
      return [];
    } else if (is(input[0], 'Array')) {
      return [unannotate(input[0])].concat(unannotate(input.slice(1)));
    } else {
      return unannotate(input[0]).concat(unannotate(input.slice(1)));
    }
  } else {
    return [input.value];
  }
};

describe('littleLisp', function() {
  describe('parse', function() {
    it('should lex a single atom', function() {
      expect(t.parse("a").value).toEqual("a");
    });

    it('should lex an atom in a list', function() {
      expect(unannotate(t.parse("()"))).toEqual([]);
    });

    it('should lex multi atom list', function() {
      expect(unannotate(t.parse("(hi you)"))).toEqual(["hi", "you"]);
    });

    it('should lex list containing list', function() {
      expect(unannotate(t.parse("((x))"))).toEqual([["x"]]);
    });

    it('should lex list containing list', function() {
      expect(unannotate(t.parse("(x (x))"))).toEqual(["x", ["x"]]);
    });

    it('should lex list containing list', function() {
      expect(unannotate(t.parse("(x y)"))).toEqual(["x", "y"]);
    });

    it('should lex list containing list', function() {
      expect(unannotate(t.parse("(x (y) z)"))).toEqual(["x", ["y"], "z"]);
    });

    it('should lex list containing list', function() {
      expect(unannotate(t.parse("(x (y) (a b c))"))).toEqual(["x", ["y"], ["a", "b", "c"]]);
    });

    describe('atoms', function() {
      it('should parse out numbers', function() {
        expect(unannotate(t.parse("(1 (a 2))"))).toEqual([1, ["a", 2]]);
      });
    });
  });

  describe('interpret', function() {
    describe('lists', function() {
      it('should return empty list', function() {
        expect(t.run('()')).toEqual([]);
      });

      it('should return list of strings', function() {
        expect(t.run('("hi" "mary" "rose")')).toEqual(['hi', "mary", "rose"]);
      });

      it('should return list of numbers', function() {
        expect(t.run('(1 2 3)')).toEqual([1, 2, 3]);
      });

      it('should return list of numbers in strings as strings', function() {
        expect(t.run('("1" "2" "3")')).toEqual(["1", "2", "3"]);
      });
    });

    describe('atoms', function() {
      it('should return string atom', function() {
        expect(t.run('"a"')).toEqual("a");
      });

      it('should return string with space atom', function() {
        expect(t.run('"a b"')).toEqual("a b");
      });

      it('should return string with opening paren', function() {
        expect(t.run('"(a"')).toEqual("(a");
      });

      it('should return string with closing paren', function() {
        expect(t.run('")a"')).toEqual(")a");
      });

      it('should return string with parens', function() {
        expect(t.run('"(a)"')).toEqual("(a)");
      });

      it('should return number atom', function() {
        expect(t.run('123')).toEqual(123);
      });
    });

    describe('invocation', function() {
      it('should run print on an int', function() {
        expect(t.run("(print 1)")).toEqual(1);
      });

      it('should return first element of list', function() {
        expect(t.run("(head (1 2 3))")).toEqual(1);
      });

      it('should return rest of list', function() {
        expect(t.run("(tail (1 2 3))")).toEqual([2, 3]);
      });
    });

    describe('lambdas', function() {
      it('should return correct result when invoke lambda w no params', function() {
        expect(t.run("((lambda () (tail (1 2))))")).toEqual([2]);
      });

      it('should return correct result for lambda that takes and returns arg', function() {
        expect(t.run("((lambda (x) x) 1)")).toEqual(1);
      });

      it('should return correct result for lambda that returns list of vars', function() {
        expect(t.run("((lambda (x y) (x y)) 1 2)")).toEqual([1, 2]);
      });

      it('should get correct result for lambda that returns list of lits + vars', function() {
        expect(t.run("((lambda (x y) (0 x y)) 1 2)")).toEqual([0, 1, 2]);
      });

      it('should return correct result when invoke lambda w params', function() {
        expect(t.run("((lambda (x) (head (x))) 1)"))
          .toEqual(1);
      });
    });

    describe('def', function() {
	  it('should allow a function to be defined', function() {
		expect(t.run("(def foo (x y) (add x y))")).toEqual('FOO');
	  });

	  it('should allow a function to be defined and called', function() {
		expect(t.run("((def foo (x y) (add x y)) (foo 4 3))")).toEqual([ 'FOO', 7 ]);
	  });

	  it('should allow a function to be defined with multiple statements and called', function() {
		expect(t.run("((def foo (x) (let ((y 6)) (add x y))) (foo 4))")).toEqual([ 'FOO', 10 ]);
	  });

	  it('should allow a function to be defined and called later in module', function() {
		expect(t.run("((def foo (x y) (add x y)) (1) (2) (foo 4 3))")).toEqual([ 'FOO', [ 1 ], [ 2 ], 7 ]);
	  });

	  it('should return undefined when function is not defined', function() {
		expect(t.run("((foo 4 3))")).toEqual([ [ undefined, 4, 3 ] ]);
	  });
	});

    describe('let', function() {
      it('should eval inner expression w names bound', function() {
        expect(t.run("(let ((x 1) (y 2)) (x y))")).toEqual([1, 2]);
      });

      it('should not expose parallel bindings to each other', function() {
        // Expecting undefined for y to be consistent with normal
        // identifier resolution in littleLisp.
        expect(t.run("(let ((x 1) (y x)) (x y))")).toEqual([1, undefined]);
      });

      it('should accept empty binding list', function() {
        expect(t.run("(let () 42)")).toEqual(42);
      });
    });

    describe('if', function() {
      it('should choose the right branch', function() {
        expect(t.run("(if 1 42 4711)")).toEqual(42);
        expect(t.run("(if 0 42 4711)")).toEqual(4711);
      });
    });

    describe('add', function() {
	  it('should add 2 numbers', function() {
		expect(t.run("(add 1.3 1.5)")).toEqual(2.8);
		expect(t.run("(add 3 5)")).toEqual(8);
	  });
	});

    describe('compose', function() {
	  it('should compose correctly', function() {
		expect(t.run(`(
                                    let ((x (
                                    	(compose
                                    		(filter (lambda (x) (gt 5 x)))
                                    		(map (lambda (x) (add 1 x)))
                                    		(map (lambda (x) (add 1 x)))
                                    	)
                                    	(1 2 3)
                                    )) (y 4)) (print x)
                                    )`)).toEqual([3,4]);
	  });
	});
  });
});
