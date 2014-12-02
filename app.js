var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	MongoClient = require('mongodb').MongoClient;

// MongoClient.connect('mongodb://127.0.0.1:27017/chat', function (err, db) {
//     if (err) throw err;

//     collection = db.collection('test');
//     collection.insert({a: 2}, function (err, docs) {
//         collection.count(function (err, c) {
//             console.log(c);
//         });
//     });
// });


server.listen(8080);


// app configs
app.engine('ejs', require('ejs-locals'));
app.set('port', 8000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));

app.use(express.bodyParser());
app.use(express.cookieParser());

app.use(app.router);

app.use( function( req, res, next ) {
	if (req.url == '/') {
		res.render('index', {});
	} else {
		next();
	}
});


app.use( function( req, res ) {
	res.status(404);
	res.render('error');
});

// list of users
var usernames = {};
var userIds = {};
// list of chatrooms
var chatRooms = [];
var currentChatRoom;

io.sockets.on('connection', function (socket) {

	// send message to chat listener
	socket.on('sendchat', function (data, room) {
		// we tell the client to execute 'updatechat' with 2 parameters
		if (socket.username != null ) {
			socket.emit('updatechat', 'Ви', data, true, false);
			socket.broadcast.to(socket.room).emit('updatechat', socket.username, data, false, room);
		}
	});

	// add new user to chat listener
	socket.on('adduser', function(username){
		// we store the username in the socket session for this client
		if (username != null && username.length) {
			var d = new Date();
			var id = d.getTime();
			socket.username = username;
			socket.room = 'common';
			socket.join(socket.room);
			// add the client's username to the global list
			usernames[username] = username;
			userIds[username] = id;

			// echo to client they've connected
			socket.emit('updatechat', 'SERVER', 'ви успішно підключились', false, false);
			// echo globally (all clients) that a person has connected
			socket.broadcast.emit('updatechat', 'SERVER', 'Користувач ' + username + ' додався до чату', false, false);
			// update the list of users in chat, client-side

			io.sockets.emit('updateusers', usernames, userIds);
		} else {
		  //socket.emit('errorAddUser');
		}
	});

	// start new dialog listener
	socket.on('startDialog', function (user_id, my_id) {
		var room;
		if (user_id == 'common') {
			room = user_id;
			message = 'ви перейшли до загального діалогу';
		} else {
			if (user_id > my_id) {
				room = user_id + '_' + my_id;
			} else {
				room = my_id + '_' + user_id;
			}
		}

		message = 'ви перейшли до діалогу з ' + user_id;

		//socket.leave(socket.room);
		socket.room = room;
		// join new room, received as function parameter
		socket.join(room);
		//socket.emit('updatechat', 'SERVER', message, false, false);
	});


	// change user name listener
	socket.on('updateName', function( username ) {
		var lastName = socket.username;
		//
		if (username != null && username.length) {
			socket.username = username;
			usernames[username] = username;
			usernames[lastName] = undefined;
			userIds[username] = userIds[lastName];
			delete userIds[lastName];
			// echo to client they've connected
			socket.emit('updatechat', 'SERVER', 'ви успішно змінили ім`я на ' + username, false, false);
			// echo globally (all clients) that a person has connected
			socket.broadcast.emit('updatechat', 'SERVER', 'Користувач ' + lastName + ' змінив ім`я на ' + username, false, false);
			// update the list of users in chat, client-side
			io.sockets.emit('updateusers', usernames, userIds);
		}
	});

	// user leave chat listener
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		socket.join('common');

		delete usernames[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames, userIds);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' покинув чат', false, 'ALL');
	});
});
