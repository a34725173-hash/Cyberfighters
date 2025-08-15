window.Network = (function () {
  const socket = io();
  return {
    setName: (name) => socket.emit("setName", name),
    sendChoice: (data) => socket.emit("choice", data),
    onPlayers: (cb) => socket.on("players", cb),
    onBattle: (cb) => socket.on("battle", cb),
    onRoleAssign: (cb) => socket.on("roleAssign", cb),
    onNewRound: (cb) => socket.on("newRound", cb)
  };
})();
