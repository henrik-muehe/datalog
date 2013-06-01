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

// serve static content from the 'examples' directory
app.use("/examples", express.static('examples'));

// use body parser to get access to form data
app.use(express.bodyParser());

// use the input validator
app.use(expressValidator);

// add a 'endsWith' function to String
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

// read configuration file
var config = JSON.parse(fs.readFileSync('config.json','utf8')); 

// used to create temporary files
var counter = 0;

// Datalog REST service
app.post('/datalog', function (req, res) {

	// validate user input
  req.assert('ruleset', 'required').notEmpty();
  req.assert('ruleset', 'max. 4096 characters allowed').len(0, 4096);
  req.assert('ruleset', 'ruleset contains unallowed characters').is(/^[\[\]_=':\-\+<>\ \\a-zA-Z0-9\%\n\r(),;\.\t]+$/);

  req.assert('query', 'required').notEmpty();
  req.assert('query', 'max. 128 characters allowed').len(0, 128);
  req.assert('query', 'query contains unallowed characters').is(/^[_[\[\]=':\-\+<>\ \\a-zA-Z0-9\%\n\r(),;\.\t]+$/);

  var validationErrors = req.validationErrors();
  if (validationErrors) {
    res.json({ 
      'answer': answer,
      'error': 'There have been validation errors: ' + util.inspect(validationErrors) });
    return;
  }

  // write the ruleset to a temporary file
  counter++;
  var tempFile = config.tempDirectory + '/ruleset-' + counter + '.dl';
  fs.writeFile(tempFile, req.body.ruleset, function(err) {
    if(err) {
      console.log(err);
    } 
  });

  // start a DES process and connect the streams
  var desProcess = spawn(config.desExecutable);
  var desProcessIsRunning = true;
  var computationTimeExceeded = false;
  var answer = '';
  
  // terminates the process if the computation takes too much time
  setTimeout(function() {
  	if (desProcessIsRunning) {
	  	computationTimeExceeded = true;
	  	console.log("Terminating DES due to timeout.");
	  	desProcess.kill('SIGKILL');
	  	try {
	  	  fs.unlinkSync(tempFile);
	    } catch (err) {}
  	}
  }, config.desTimeLimitMillis);
  
  // reading the standard output of DES
  desProcess.stdout.on('data', function (data) {
    data = '' + data;
    if (!data.match(/^\*/g)) {
      data = data.replace(/DES>/g, '');
      data = data.replace(/\r\n\r\n/g, '\n');
      answer = answer + data;
    }
  });
  
  // send the answer after the computation has been finished
  desProcess.on('exit', function (code) {
    desProcessIsRunning = false;
    try {
    	fs.unlinkSync(tempFile);
    } catch (err) {}
    if (computationTimeExceeded) {
    	answer = "---  Sorry, computation time exceeded...  ----"
    }
    res.json({ 
      'answer': answer
    });
  });
  
  // consult the previously written file
  desProcess.stdin.write('/consult ' + tempFile + '\n');
 
	// transform query into a single line string
  var queryLines = req.body.query.split(/\n/);
  var query = "";
  queryLines.forEach(function(line) {
  	query += line + " ";
  });
	console.log("Executing query " + counter + ": " + query);

  // submit query
  desProcess.stdin.write(query + '\n');
  
  // terminate the process
  desProcess.stdin.end();  
});

// Examples REST service. Delivers the examples to the client.
app.get('/examples', function (req, res) {

	// reads the contents of the examples directory
	// and sends a list to the client.
	
	// the examples are delivered as static content
  var exampleDescriptors = [];
  var exampleFiles = fs.readdirSync(config.examplesDirectory);
  exampleFiles.forEach(function(file) {
    if (file.endsWith(".json")) {
	  	var fileContents = fs.readFileSync(config.examplesDirectory + '/' + file,'utf8'); 
			var example = JSON.parse(fileContents);
			exampleDescriptors.push({
				"name": example.name,
				"description": example.description,
				"source": example.source,
				"url": "/examples" + "/" + file,
			});
		}
  });
	res.json(exampleDescriptors);
});


app.listen(config.port);
console.log('Started web service on port ' + config.port + '.');
