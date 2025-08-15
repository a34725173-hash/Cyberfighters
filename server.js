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
      console.log(`Player ${socket.id} joined existing room ${room}`);
      return room;
    }
  }
  let rid = 'room-' + Math.random().toString(36).substring(2, 8);
  games[rid] = { players: [socket.id], choices: {}, names: {} };
  console.log(`Player ${socket.id} created new room ${rid}`);
  return rid;
}

function determineRoles(room) {
  const playerIds = games[room].players;
  if (playerIds.length < 2) {
    console.log(`Room ${room} waiting for more players`);
    return;
  }

  let diceA = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
  let diceB = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;

  if (diceA === diceB) {
    console.log(`Room ${room} dice tie, re-rolling`);
    return determineRoles(room); // 平局重擲
  }

  let assign = {};
  if (diceA > diceB) {
    assign[playerIds[0]] = { role: 'atk', dice: diceA };
    assign[playerIds[1]] = { role: 'def', dice: diceB };
  } else {
    assign[playerIds] = { role: 'def', dice: diceA };
    assign[playerIds[1]] = { role: 'atk', dice: diceB };
  }

  console.log(`Roles for room ${room}: ${playerIds}=${assign[playerIds].role}(${assign[playerIds].dice}), ${playerIds[1]}=${assign[playerIds[1]].role}(${assign[playerIds[1]].dice})`);
  
  io.to(playerIds).emit('roleAssign', assign[playerIds]);
  io.to(playerIds[1]).emit('roleAssign', assign[playerIds[1]]);
}

io.on('connection', socket => {
  console.log(`New connection: ${socket.id}`);
  let playerRoom = createOrJoinRoom(socket);
  socket.join(playerRoom);

  socket.on('setName', (name) => {
    games[playerRoom].names[socket.id] = name;
    io.to(playerRoom).emit('players', Object.values(games[playerRoom].names));
    console.log(`Room ${playerRoom} players:`, games[playerRoom].names);
    if (games[playerRoom].players.length === 2) {
      determineRoles(playerRoom);
    }
  });

  socket.on('choice', (data) => {
    console.log(`Received choice from ${socket.id}:`, data);
    games[playerRoom].choices[socket.id] = data;
    if (Object.keys(games[playerRoom].choices).length === 2) {
      io.to(playerRoom).emit('battle', games[playerRoom].choices);
      games[playerRoom].choices = {};
      determineRoles(playerRoom);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (games[playerRoom]) {
      games[playerRoom].players = games[playerRoom].players.filter(id => id !== socket.id);
      delete games[playerRoom].names[socket.id];
      if (games[playerRoom].players.length === 0) {
        delete games[playerRoom];
        console.log(`Room ${playerRoom} deleted (empty)`);
      } else {
        io.to(playerRoom).emit('players', Object.values(games[playerRoom].names));
      }
    }
  });
});

server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
