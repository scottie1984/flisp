#! /usr/bin/env node

var fs = require('fs');
var flisp = require("./flisp");

fs.readFile(process.argv[2], (err, data) => flisp.interpret(flisp.parse(data.toString())))