var child_process = require('child_process');
const path = require('path');

function init() {
	var child = child_process.fork(__dirname + path.sep + 'rcon.js', [], {
	  stdio: 'pipe'
	});

	child.on('data', function(data) {
	  console.log(data);
	});

	child.on('exit', function (code) {    
		console.log("rcon restarting in 5 seconds...");
		setTimeout(function() {
			init();
		}, 5000);
	});
}

init();

