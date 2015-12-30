#! /usr/bin/env node

var fs = require('fs');
var flisp = require("./flisp");

fs.readFile(process.argv[2], (err, data) => flisp.run(data.toString()))