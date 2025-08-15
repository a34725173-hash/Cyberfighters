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
      console.debug(`Player ${socket.id} joined room ${room}`);
      return room;
    }
  }
  const rid = 'room-' + Math.random().toString(36).substring(2, 8);
  games[rid] = { players: [socket.id], choices: {}, names: {} };
  console.debug(`Player ${socket.id} created room ${rid}`);
  return rid;
}

function determineRoles(room) {
  const playerIds = games[room].players;
  if (playerIds.length < 2) {
    console.debug(`Room ${room} waiting for more players`);
    return;
  }

  let diceA = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
  let diceB = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;

  while (diceA === diceB) {
    diceA = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    diceB = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
  }

  let assign = {};
  if (diceA > diceB) {
    assign[playerIds[0]] = { role: 'atk', dice: diceA };
    assign[playerIds[1]] = { role: 'def', dice: diceB };
  } else {
    assign[playerIds] = { role: 'def', dice: diceA };
    assign[playerIds[1]] = { role: 'atk', dice: diceB };
  }

  console.debug(`Room ${room} roles assigned: ${JSON.stringify(assign)}`);

  io.to(playerIds[0]).emit('roleAssign', assign[playerIds]);
  io.to(playerIds[1]).emit('roleAssign', assign[playerIds[1]]);
}

io.on('connection', socket => {
  console.debug(`Client connected: ${socket.id}`);
  let room = createOrJoinRoom(socket);
  socket.join(room);

  socket.on('setName', (name) => {
    games[room].names[socket.id] = name;
    io.to(room).emit('players', Object.values(games[room].names));
    if (games[room].players.length === 2) {
      determineRoles(room);
    }
  });

  socket.on('choice', (data) => {
    console.debug(`Choice from ${socket.id}:`, data);
    games[room].choices[socket.id] = data;
    if (Object.keys(games[room].choices).length === 2) {
      io.to(room).emit('battle', games[room].choices);
      games[room].choices = {};
      determineRoles(room);
    }
  });

  socket.on('disconnect', () => {
    console.debug(`Client disconnected: ${socket.id}`);
    if (games[room]) {
      games[room].players = games[room].players.filter(id => id !== socket.id);
      delete games[room].names[socket.id];
      if (games[room].players.length === 0) {
        delete games[room];
        console.debug(`Room ${room} deleted (empty)`);
      } else {
        io.to(room).emit('players', Object.values(games[room].names));
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
