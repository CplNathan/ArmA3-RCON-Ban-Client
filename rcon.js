var express = require('express');
var BattleNode = require('battle-node');
var fs = require('fs');
var path = require('path');
var requestify = require('requestify'); 

var datafile = "/home/user/" + "chatlog.db"; // datafile location for chatlogs
var chatLogs = [];

// Rcon Config
var config = {
  ip: '',
  port: 2305,
  rconPassword: ''
};

var bnode = new BattleNode(config);

function parsePlayers(dump) {

    if(dump.length) {

    var playerList = dump.split("\n");
    var players = [];

    for (i = 0; i < playerList.length; i++) {
        if(i > 2 && i < playerList.length-1) {

            var name = "";

            for (x = 0; x < playerList[i].split(/\ +/).length; x++) {
                if(x >= 4) {
                    name += " " + playerList[i].split(/\ +/)[x];
                }
            }

            var player = {
                id: playerList[i].split(/\ +/)[0],
                ip: playerList[i].split(/\ +/)[1].split(":")[0],
                ping: playerList[i].split(/\ +/)[2],
                uniqueid: playerList[i].split(/\ +/)[3].split("(")[0],
                name: name
            }

            playerList[i].split(/\ +/)

            players.push(player);
        }

        /* if(i == playerList.length-1) {
            console.log("players on server: " +  playerList[i].split(" ")[0].substr(1));
        } */
    }
    return players;

    }
}

bnode.login();

bnode.on('login', function(err, success) {

  if (err) { 
  	console.log('Unable to connect to server ' + config.ip + ":" + config.port);
  	process.exit(); 
  }

  if (success == true) {
    console.log('Logged in RCON successfully.');
  }
  else if (success == false) {
    console.log('RCON login failed! (password may be incorrect)');
    process.exit();
  }

});

function saveData() {
  try {
    fs.writeFileSync(datafile, JSON.stringify({chatLogs: chatLogs}, null, 2));
  } catch(e) {
    console.log("Could not create " + datafile + " exiting");
  }
}

bnode.on('message', function(message) {

  // get player guid and id on join

  var res = message.match(/^Verified GUID \(([a-z0-9]{32})\) of player \#([0-9]{1,})/);

  if(res !== null) {
    checkPlayer(res[1], res[2]);
  }

  var res = message.match(/^\(Side\) (.{1,}): (.{1,})/);

  if(res !== null) {
    chatLogs.push([
      res[1],
      res[2]
    ])
    saveData()
  };
});

// Here it checks if the GUID is responded by the web app this has to be handled by your own app this is just some logic
function checkPlayer(guid, id) {
  requestify.get('https://account.fragwith.us/' + guid).then(function(response) {
    var answer = response.getBody();

    if(answer.isBanned === true) {


      var kickcmd = 'kick ' + id + ' ' + 'You are banned(#' + answer.history.id + '). Visit fragwith.us/bans for more info';

      bnode.sendCommand(kickcmd);
    }
  });
}

// send commands once connected
setTimeout(function() {

  bnode.sendCommand('version', function(version) {
    console.log('Battle Eye Version ' + version);
  });

  var checkLoop = setInterval(function() {
    bnode.sendCommand('players', function(output) {
      var players = parsePlayers(output);
        for(player in players) {
          //console.log("Checking:", players[player]);
          checkPlayer(players[player].uniqueid,players[player].id);
        }
    });
  }, 10000);
}, 1000);

bnode.on('disconnected', function() {

  console.log('RCON server disconnected.');
  chatLogs = [];
  saveData()
  process.exit();

});