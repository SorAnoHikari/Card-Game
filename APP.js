if (!process.argv[2]){
	console.log("Please specify the port to listen on.");
	process.exit();
}

var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , url = require('url')
  , repl = require('repl')
  , _ = require('underscore');



app.listen(process.argv[2]);
io.set('log level', 1);

function handler (req, res) {

  pathname = url.parse(req.url).pathname;
  if (pathname == "/favicon.ico" || pathname == "/") pathname = "/index.html";
  
  data = fs.readFileSync(__dirname + '' + pathname);//'/index.html')
  res.writeHead(200);
  res.end(data);
  
}

io.sockets.on('connection', function (socket) {

	socket.plain = false; //User is capable of using fancy CSS
	socket.IPaddr = socket.handshake.address;
	console.log("New connection from " + socket.IPaddr.address + ":" + socket.IPaddr.port);
 
  socket.on('chat', function (data) {
    var oldName = socket.name;
	socket.name = data.name;
	if (oldName != socket.name) 
		console.log(socket.handshake.address.address + " changed name from " + oldName + " to " + socket.name);
	
	filterAndEnhance(data, socket);
	
	if (data.message[0] == '/')
		processSpecial(data, socket);
	else
		io.sockets.emit('chatReceived', data);
	
	var d = new Date;
	d.setUTCHours(d.getUTCHours() - 4) //Convert date to local time for me, at least
	
	fs.appendFile("log.txt", d.toISOString().slice(0,19) + " --  " + data.name + ":  " + data.message + "\n");
  });
	
  socket.on('disconnect', function() {
		var identifier = socket.name || socket.handshake.address.address;
		console.log(identifier + " has left chat.  Bye!");
		socket.broadcast.emit('system', {message: identifier + " has left chat.  Bye!"});
  });
  
  });
  
//Regex filtering for banned words, links, etc
function filterAndEnhance(data, socket) {
	
	//Replaces sakuya is love
	data.message = data.message.replace(/Sakuya is love/i, "Sakuya is shit");
	
	//Makes links clickable
	data.message = data.message.replace(/(http:\/\/[^ ]+) ?(.*)$/, "<a href='$1' target='_blank'>$1 </a>$2");

	//Removes extra CSS
	if (socket.plain)
		data.colour = data.colour.slice(0, data.colour.indexOf(';'));
}
	
//User commands
function processSpecial(data, socket) {
	//Special commands prefixed by /
	if (data.message.match(/^\/pm/)) {
	//PMs.  Syntax: /pm %name% message
	//Maybe clean this up later since it's really bad
		var i1 = data.message.indexOf('%')+1;
		var i2 = data.message.indexOf('%', i1);
		var targetName = data.message.slice(i1, i2);
		data.message = data.message.slice(i2+1);
		var t = _.findWhere(io.sockets.clients(), {name: targetName});
			if (t){
				t.emit('pmReceived', data);
				socket.emit('pmReceived', data);
			}
	}
}
  
//Server commands   
var cons = repl.start({});

cons.context.say = say;
cons.context.plainify = plainify;

function say(message, target) {
//Say something.  Pass a username as second parameter to make it a PM.
	var data = {name: "SERVER",
				message: message,
				colour: "#FF0000; font-size:40px; font-weight:bold"};
	if (target == undefined) {
		io.sockets.emit('chatReceived', data);
	}
	else {
		var t = _.findWhere(io.sockets.clients(), {name: target});
		t.emit('pmReceived', data);
	}
}

function plainify(target){
//Removes fun css stuff from the target and lets them use only colour (or restores their ability)
	var t = _.findWhere(io.sockets.clients(), {name: target});
	if (t){
		t.plain = !t.plain;
		t.emit('system', {message: "Your fancy CSS privileges have been " + (t.plain ? "removed." : "restored.")});
		}
}