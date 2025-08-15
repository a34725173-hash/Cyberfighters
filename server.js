const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let games = {}; // roomId: { players: [socketId...], choices: {}, etc. }

function createOrJoinRoom(socket) {
  // 嘗試配對未滿2人的房間
  for (const [room, info] of Object.entries(games)) {
    if (info.players.length < 2) {
      info.players.push(socket.id);
      return room;
    }
  }
  // 新開一房
  let rid = 'room-'+Math.random().toString(36).substring(2,8);
  games[rid] = { players: [socket.id], choices: {}, names: {} };
  return rid;
}

io.on('connection', (socket) => {
  let playerRoom = createOrJoinRoom(socket);
  socket.join(playerRoom);

  socket.on('setName', (name) => {
    games[playerRoom].names[socket.id] = name;
    io.to(playerRoom).emit('players', Object.values(games[playerRoom].names));
  });

  socket.on('choice', (data) => {
    games[playerRoom].choices[socket.id] = data;
    // 當2人都完成選擇
    if (Object.keys(games[playerRoom].choices).length === 2) {
      // 廣播給全房
      io.to(playerRoom).emit('battle', games[playerRoom].choices);
      // 重設choices
      games[playerRoom].choices = {};
    }
  });

  socket.on('disconnect', () => {
    // 清理房間和玩家
    if (games[playerRoom]) {
      games[playerRoom].players = games[playerRoom].players.filter(id=>id!=socket.id);
      delete games[playerRoom].names[socket.id];
      if (games[playerRoom].players.length === 0) delete games[playerRoom];
      else io.to(playerRoom).emit('players', Object.values(games[playerRoom].names));
    }
  });
});

server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
