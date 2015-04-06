var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var express = require('express');
var crypto = require('crypto');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var session = require('express-session');


var userDic = {};



var connection = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'web_dojo',
   port: 3306
});

connection.connect(function(error){
   if(error){
      throw error;
   }else{
      console.log('Conexion correcta.');
   }
});



app.use(bodyParser()); 
app.use(express.static(__dirname + '/public'));
app.use(session({secret: 'abcd1234'}));

app.post('/login', function(req, res){
	var token="00";
	var flagOk = false;
	var idUsers="";
	
    
    crypto.randomBytes(4, function(ex, buf) {
    	token = buf.toString('hex');
    });
    
	
	console.log('/login');
	console.log('Username: ' + req.body.username);
	console.log('Password: ' + req.body.password);
	
	var query = connection.query('select * from users where nick = ? ;',[req.body.username], function(error, result){
	 	   if(error){
	 	      throw error;
	 	   }else{
 	      
	 	      if(result.length > 0)
	 	      {
	 	     
	 	    	 if(result[0].pass == req.body.password)
	 	    	 {
	 	    		
	 	    		idUsers = result[0].idusers;
	 	    		userDic[result[0].idusers] = {'name': req.body.username,'is_master' : 0 , 'idFile': 0, 'tokenId' : token};
	 	    		flagOk = true;
	 	    	 }
	 	      
	 	      }
	 	      
	 	   }
	 		if(flagOk == true)
	 		{
	 			console.log("ENVIO OK");
	 			res.json([idUsers,token,"OK"]);
	 			
	 		}
	 		else
	 			
	 			res.writeHead(500, { 'Content-Type': 'application/json' });
 				res.end();
	 	   
	 	 }
	 );
	

	
});




app.post('/start', function(req, res){
	
	res.sendFile(__dirname +'/index.html');
	
});


app.get('/', function(req, res){
	  res.sendFile(__dirname + '/login.html');
});


io.on('connection', function(socket){
  console.log('a user connected'+socket.id);
  socket.emit('prueba', { some: 'data'+socket.id });
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
  });
});


//MASTER PEDIDO y MASTER RESPUESTA
//userData = {'userId': localStorage.id,'token': localStorage.token ,'fileId':localStorage.fileId}
//dicc_files_joins[fileId].push({'userId': msg.userId, 'isMaster' : 0}); 

io.on('connection', function(socket){
	  socket.on('i_wish_be_master', function(msg){
	    
		userId = msg.userId;
	    fileId = msg.fileId;
	    token = msg.token;
	    
		if (isValidUser(userId,token))
		{
		  
			//Falta validar si corresponde que se master  
		    console.log('new master is: ' + msg);
		    io.emit('new_master', msg);
		    
		    if (dicc_files_joins[msg.fileId] != undefined)
		    {	
		    	for (k in dicc_files_joins[msg.fileId])
		    	{
		    		if (dicc_files_joins[msg.fileId][k]["userId"] == userId)
		    			dicc_files_joins[msg.fileId][k]["is_master"] = 1;
		    		else
		    			dicc_files_joins[msg.fileId][k]["is_master"] = 0;
		    	}
		    	sendUserList(fileId);
		    }
		    
		}
		
	  });
});


function sendUserList(fileId)
{
	
	io.emit('user list', [fileId,dicc_files_joins[fileId]]);	
}

// Envio de tramas para realizar pruebas
io.on('connection', function(socket){
  socket.on('test message', function(msg){
    console.log('pass: ' + msg);
    
    
    var token;
    crypto.randomBytes(4, function(ex, buf) {
    	token = buf.toString('hex');
    });
    
    var newOptions = {
            'red' : 'Red',
            'blue' : 'Blue',
            'green' : 'Green',
            'yellow' : 'Yellow'
        };
    
  
    var name = '1347';
    var hash = crypto.createHash('md5').update(name).digest("hex");
    console.log(hash);
    io.emit('pass message', token);
    io.emit('file list', newOptions);
  
  });
});

function isValidUser (userId, token)
{
	return true;

}

function joinUser(fileId,userId)
{

	  if(dicc_files_joins[fileId] == undefined)
	  {
		  dicc_files_joins[fileId] = [];
		  
	  }
	  if(dicc_files_joins[fileId].indexOf() == -1)
	  {
		  for (i in dicc_files_joins[fileId])
		  {
			  if(dicc_files_joins[fileId][i].userId == userId)
			  {
				  dicc_files_joins[fileId].splice(i, 1);// elimino al usuario
			
			  }
		  }
		  if(userDic[userId] != undefined)
		  {
			  dicc_files_joins[fileId].push({'userId': userId, 'is_master' : 0, "name":userDic[userId].name}); 
		  }
	  }
	  io.emit('new join', fileId);
	
}


var dicc_files_joins = {};

io.on('connection', function(socket){
	  socket.on('get file', function(msg){
		    console.log('get file: ' + msg);
		    
		    userId = msg.userId;
		    fileId = msg.fileId;
		    token = msg.token;
		    
		    if (isValidUser(userId,token))
		    {
			    var query = connection.query('select * from files where idfiles = ? ;',[fileId], function(error, result){
			    	   if(error){
			    	      throw error;
			    	   }else{
			    	      //console.log(result);
			    	      if(result.length > 0)
			    	      {
			    	    	  io.emit('file content', [result[0].content,fileId,userId]);
			    	    	  
		    	    		  joinUser(fileId,userId); 

			    	    	  
			    	    	  sendUserList(fileId);
			    	      
			    	      }
			    	      
			    	   }
			    	 }
			    );
		    }
	  
	  
	  });
});

io.on('connection', function(socket){
	  socket.on('join file', function(msg){
		    console.log('get file: ' + msg);
		    
		    userId = msg.userId;
		    fileId = msg.fileId;
		    token = msg.token;
		    
		    if (isValidUser(userId,token))
		    {
    	    		  joinUser(fileId,userId); 

		    }
		    sendUserList(fileId);
		    
	  });
});

// userData = {'userId': localStorage.id,'token': localStorage.token ,'fileId':localStorage.fileId}
// socket.emit('file change',[editor.getSession().getValue(),editor.getCursorPosition(), userData]);

io.on('connection', function(socket){
  socket.on('file change', function(msg){
	    
	    userId = msg[2].userId;
	    fileId = msg[2].fileId;
	    token = msg[2].token;
	    
	    if (isValidUser(userId,token))
	    {
	    	// falta validar si es un master correcto para ese archivo
	    	io.emit('file change', msg);
	    	
	    }
  
  });
});



/*
io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});
*/

	
http.listen(3000, function(){
  console.log('listening on *:3000');
});
