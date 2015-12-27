var repl = require("repl");
var flisp = require("./flisp");

repl.start({
  prompt: "> ",
  eval: function(cmd, context, filename, callback) {
    if (cmd !== "(\n)") {
      cmd = cmd.slice(1, -2); // rm parens and newline added by repl
      var ret = flisp.interpret(flisp.parse(cmd));
      callback(null, ret);
    } else {
      callback(null);
    }
  }
});
