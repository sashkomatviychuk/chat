var socket = io.connect('http://localhost:8080');

var messageOthers = '<span class="time">[{time}]</span> <span class="user">{user}</span>: <span class="data">{data}</span>';

var messageMe = '<span class="time">[{time}]</span> <span class="user me">{user}</span>: <span class="data">{data}</span>';

var messageInfo = '<span class="time">[{time}]</span> <span class="data-info">{data}</span>'

var msg;

var myName;
var myId;

var $activeContainer;
var $activeConv;

// on connection to server, ask for user's name with an anonymous callback
socket.on('connect', function(){
	$activeContainer = $('#common');
	$activeConv = $activeContainer.find('div.conv');
	myName = prompt("What's your name?");

	socket.emit('adduser', myName);
});

socket.on('errorAddUser', function() {
	myName = prompt("What's your name?");

	socket.emit('adduser', myName);
});

  // listener, whenever the server emits 'updatechat', this updates the chat body
socket.on('updatechat', function (username, data, me, room) {

	var time = (new Date).toLocaleTimeString();

	if (room) {
		$activeContainer = $('#' + room);
		$activeConv = $activeContainer.find('div.conv');
	}

	if (username == 'SERVER') {
		msg = messageInfo.replace('{time}', time).replace('{data}', data);
	} else {
		if (!me) {
			msg = messageOthers.replace('{time}', time).replace('{user}', username).replace('{data}', data);
		} else {

			msg = messageMe.replace('{time}', time).replace('{user}', username).replace('{data}', data);
		}
	}

	if (room == 'ALL') {
		$('div.conv').each(function() {
			$(this).append(msg + '<hr>');
			$(this).scrollTop($(this).scrollHeight);
		});
	} else {
		$activeConv.append(msg + '<hr>');
		$activeConv.scrollTop($("#conversation")[0].scrollHeight);
	}
});

// Users online list
socket.on('updateusers', function(data, userIds) {
	$('#users').empty();
	myId = userIds[myName];
	$('#users').append('<div><a class="dialog" href="#" onclick="changeChat(\'common\');">Common chat</a></div>');
	$.each(data, function(key, value) {
		if (key != myName) {
		 $('#users').append('<div><a class="dialog" href="#" onclick="changeChat(\'id'+userIds[key] + '\',\''+ key +'\');">' + key + '</a></div>');
		} else {
			//  myId = userIds[key];
			$('#users').append('<div>' + key + '</div>');
		}

	});

	socket.emit('showDialogs');
});

// build handlebars.js template
buildTmp = function (id, title) {
	if (typeof title == 'undefined' ) {
		title = 'Common chat';
	}

	var source = $('#tmp-chat-container').html();
	var template = Handlebars.compile(source);

	return template({id: id, title: title});
}


changeChat = function (name, nameVal) {

	var $dialog = $('#' + name);

	if (!$dialog.length) {

		$dialog = buildTmp(name, nameVal );
		$(".all-chats").after($dialog);

		$dialog = $($dialog);
		if (!$dialog.find('.data-send').is(":focus")) {
			$dialog.find('.data-send').focus();
		}
	}

	$activeContainer = $('#' + name);
	$activeConv = $activeContainer.find('div.conv');

	socket.emit('startDialog', name.replace('id', ''), myId);
}

// on load of page
$(function() {

	// when the client clicks SEND
	$('#datasend').click( function() {
		var message = $('.data-send').val();
		$('.data-send').val('');
		// tell server to execute 'sendchat' and send along one parameter
		socket.emit('sendchat', message);
	});

	// function close(this) {
	//    $(this).parents('div.chat-container').remove();
	// }

	$('body').on('click', 'div.close', function (e) {
		$(this).parents('div.chat-container').remove();
	});

	$('body').on('focus', 'input.data-send', function () {
		$activeContainer = $(this).parent('.chat-container');
		$activeConv = $activeContainer.find('div.conv');
		socket.emit('startDialog', $activeContainer.attr('id').replace('id', ''), myId);
	});

	// when the client hits ENTER on their keyboard
	var $id = $($activeContainer).attr('id');

	$('body').on('keyup', 'input.data-send', function(e) {
		if(e.which == 13) {
			var message = $(this).val();
			var room = $(this).parent('.chat-container').attr('id');
			$(this).val('');

			$activeContainer = $(this).parent('.chat-container');
			$activeConv = $activeContainer.find('div.conv');

			sendTo = room;

			if (room != 'common') {
				sendTo = 'id' + myId;
			}

			// tell server to execute 'sendchat' and send along one parameter
			socket.emit('sendchat', message, sendTo);
		}
	});

	// change name in chat
	$('#update').click(function() {
		tmpMyName = prompt("Enter new name:");
		if (tmpMyName != null && tmpMyName.length) {
			myName = tmpMyName;
			socket.emit('updateName', myName);
		}
	});

});
