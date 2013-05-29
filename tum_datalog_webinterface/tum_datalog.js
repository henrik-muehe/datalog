/**
 * Backend for the Datalog web interface.
 */
var express = require('express'),
    util  = require('util'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    expressValidator = require('express-validator');
    
var app = express();

// serve static content from the 'static' directory
app.use(express.static('static'));

// use body parser to get access to form data
app.use(express.bodyParser());

// input validator
app.use(expressValidator);


var desExecutable = 'H:\\Downloads\\des\\des.exe';
var port = 3000


// REST service
app.post('/datalog', function (req, res) {

  req.assert('ruleset', 'required').notEmpty();
  req.assert('ruleset', 'max. 4096 characters allowed').len(0, 4096);
  req.assert('ruleset', 'ruleset contains unallowed characters').is(/^[_=:\-\ \\a-zA-Z0-9\%\n\r(),\.]+$/);

  req.assert('query', 'required').notEmpty();
  req.assert('query', 'max. 128 characters allowed').len(0, 128);
  req.assert('query', 'query contains unallowed characters').is(/^[_\ \\a-zA-Z0-9(),\.]+$/);

  var validationErrors = req.validationErrors();
  if (validationErrors) {
    res.json({ 
      'answer': answer,
      'error': 'There have been validation errors: ' + util.inspect(validationErrors) });
    return;
  }

  // write the ruleset to a file
  fs.writeFile('ruleset.dl', req.body.ruleset, function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("The file was saved!");
    }
  });

  // start a DES process and connect the streams
  var desProcess = spawn(desExecutable);
  var answer = '';
  
  desProcess.stdout.on('data', function (data) {
    data = '' + data;
    if (!data.match(/^\*/g)) {
      data = data.replace(/DES>/g, '');
      answer = answer + data;
      console.log(data); 
    }
  });
  
  desProcess.on('exit', function (code) {
    console.log('child process exited with code ' + code);
    console.log('done');
    res.json({ 
      'answer': answer
    });
  });
  
  // consult the previously written file
  desProcess.stdin.write('/consult ' + 'ruleset.dl' + '\n');
  
  // submit query
  desProcess.stdin.write(req.body.query + '\n');
  
  // terminate the process
  desProcess.stdin.end();
  
});


app.listen(port);
console.log('Started web service on port ' + port + '.');
