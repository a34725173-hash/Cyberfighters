const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let games = {};

function createOrJoinRoom(socket) {
  for (const [room, info] of Object.entries(games)) {
    if (info.players.length < 2) {
      info.players.push(socket.id);
      return room;
    }
  }
  let rid = 'room-' + Math.random().toString(36).substring(2, 8);
  games[rid] = { players: [socket.id], choices: {}, names: {} };
  return rid;
}

function determineRoles(room) {
  let dice1 = Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1;
  let dice2 = Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1;
  let players = games[room].players;
  let assign = {};
  if (dice1 > dice2) {
    assign[players[0]] = 'atk';
    assign[players[1]] = 'def';
  } else if (dice2 > dice1) {
    assign[players] = 'def';
    assign[players[1]] = 'atk';
  } else {
    assign[players] = 'atk';
    assign[players[1]] = 'def';
  }
  io.to(players).emit('roleAssign', assign[players]);
  io.to(players[1]).emit('roleAssign', assign[players[1]]);
  io.to(room).emit('newRound', { dice1, dice2 });
}

io.on('connection', socket => {
  let playerRoom = createOrJoinRoom(socket);
  socket.join(playerRoom);

  socket.on('setName', (name) => {
    games[playerRoom].names[socket.id] = name;
    io.to(playerRoom).emit('players', Object.values(games[playerRoom].names));
    if (games[playerRoom].players.length === 2) determineRoles(playerRoom);
  });

  socket.on('choice', (data) => {
    games[playerRoom].choices[socket.id] = data;
    if (Object.keys(games[playerRoom].choices).length === 2) {
      io.to(playerRoom).emit('battle', games[playerRoom].choices);
      games[playerRoom].choices = {};
      determineRoles(playerRoom); // 新回合自動決定攻防
    }
  });

  socket.on('disconnect', () => {
    if(games[playerRoom]){
      games[playerRoom].players = games[playerRoom].players.filter(id=>id!==socket.id);
      delete games[playerRoom].names[socket.id];
      if(games[playerRoom].players.length===0) delete games[playerRoom];
      else io.to(playerRoom).emit('players', Object.values(games[playerRoom].names));
    }
  });
});

server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
