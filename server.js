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
  const [idA, idB] = games[room].players;
  let diceA = Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1;
  let diceB = Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1;
  let assign = {};
  if (diceA > diceB) {
    assign[idA] = { role: 'atk', dice: diceA };
    assign[idB] = { role: 'def', dice: diceB };
  } else {
    assign[idA] = { role: 'def', dice: diceA };
    assign[idB] = { role: 'atk', dice: diceB };
  }
  io.to(idA).emit('roleAssign', assign[idA]);
  io.to(idB).emit('roleAssign', assign[idB]);
}

io.on('connection', socket => {
  let playerRoom = createOrJoinRoom(socket);
  socket.join(playerRoom);

  socket.on('setName', (name) => {
    games[playerRoom].names[socket.id] = name;
    io.to(playerRoom).emit('players', Object.values(games[playerRoom].names));
    if (games[playerRoom].players.length === 2)
      determineRoles(playerRoom);
  });

  socket.on('choice', (data) => {
    games[playerRoom].choices[socket.id] = data;
    if (Object.keys(games[playerRoom].choices).length === 2) {
      io.to(playerRoom).emit('battle', games[playerRoom].choices);
      games[playerRoom].choices = {};
      determineRoles(playerRoom);
    }
  });

  socket.on('disconnect', () => {
    if(games[playerRoom]){
      games[playerRoom].players = games[playerRoom].players.filter(id=>id!==socket.id);
      delete games[playerRoom].names[socket.id];
      if(games[playerRoom].players.length === 0) delete games[playerRoom];
      else io.to(playerRoom).emit('players', Object.values(games[playerRoom].names));
    }
  });
});

server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
