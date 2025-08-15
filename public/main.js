let LANG = 'zh';
window.setLang = function (l) {
  LANG = l; setText();
};
function setText() {
  document.getElementById('title').innerText = window.LANGS[LANG].title;
  document.getElementById('enterNameLabel').innerText = window.LANGS[LANG].enterName;
  document.getElementById('enterGame').innerText = window.LANGS[LANG].enterGame;
}
setText();

let myId = null;
let myName = '';
let opponentName = '';
let players = [];
let gameInited = false;
let myRole = null;
let myHP = 200, opHP = 200, round = 1;
let battleLogs = [];
let myDice = 0, opDice = 0;

const socket = io();

socket.on('connect', () => {
  myId = socket.id;
});

document.getElementById('enterGame').onclick = function () {
  myName = document.getElementById('username').value || "Player" + Math.floor(Math.random() * 100);
  socket.emit("setName", myName);
  document.getElementById('login').style.display = 'none';
  document.getElementById('mainGame').style.display = '';
  document.getElementById('status').innerText = window.LANGS[LANG].waiting;
};

socket.on("players", function (list) {
  players = list;
  if (players.length == 2 && !gameInited) {
    gameInited = true;
    opponentName = players.find(n => n !== myName);
    startGame();
  } else if (players.length < 2) {
    document.getElementById('status').innerText = window.LANGS[LANG].noOpponent;
  }
});

socket.on("roleAssign", data => {
  myRole = data.role;
  myDice = data.dice;
  showGameOptions();
});

socket.on("battle", function (choices) {
  let ids = Object.keys(choices);
  let myChoice = choices[myId];
  let opId = ids.find(id => id !== myId);
  let opChoice = choices[opId];
  opDice = opChoice.atkDice || opChoice.defDice;

  updateStatus();

  let resultStr = `【${myName}🎲${myDice} vs ${opponentName}🎲${opDice}】<br>`;
  if (myRole === 'atk') {
    let atk = window.ATTACK_METHODS.find(x => x.id === myChoice.atkMethod);
    let base = atk.calc(myChoice.atkDice, opChoice.defDice, opChoice.defMethod);
    let def = window.DEFENSE_METHODS.find(x => x.id === opChoice.defMethod);
    let succ = def.success(opChoice.defDice, myChoice.atkDice);
    let dmg = 0;
    if (opChoice.defMethod === 'counter' && succ) {
      resultStr += `${opponentName} 反擊成功，你受${base}傷害。<br>`;
      myHP -= base;
    } else if (succ) {
      dmg = def.resolve(base);
      resultStr += `${opponentName} ${def.name[LANG]}成功，只受${dmg}傷害。<br>`;
      opHP -= dmg;
    } else {
      resultStr += `${opponentName} 防禦失敗，受${base}傷害。<br>`;
      opHP -= base;
    }
  } else {
    let atk = window.ATTACK_METHODS.find(x => x.id === opChoice.atkMethod);
    let base = atk.calc(opChoice.atkDice, myChoice.defDice, myChoice.defMethod);
    let def = window.DEFENSE_METHODS.find(x => x.id === myChoice.defMethod);
    let succ = def.success(myChoice.defDice, opChoice.atkDice);
    let dmg = 0;
    if (myChoice.defMethod === 'counter' && succ) {
      resultStr += `你反擊成功，${opponentName} 受${base}傷害。<br>`;
      opHP -= base;
    } else if (succ) {
      dmg = def.resolve(base);
      resultStr += `你${def.name[LANG]}成功，只受${dmg}傷害。<br>`;
      myHP -= dmg;
    } else {
      resultStr += `防禦失敗，你受${base}傷害。<br>`;
      myHP -= base;
    }
  }

  battleLogs.push(`第${round}回合：<br>` + resultStr);
  updateBattleLog();

  setTimeout(() => {
    if (myHP <= 0 || opHP <= 0) {
      document.getElementById('status').innerHTML += "<br>" + window.LANGS[LANG].battleLog;
    } else {
      round++;
      myDice = 0; opDice = 0;
      document.getElementById('game-container').innerHTML = '';
      document.getElementById('status').innerText = '等待下一回合...';
    }
  }, 3000);
});

function updateStatus() {
  document.getElementById('status').innerHTML =
    `${myName} (${myRole === 'atk' ? '攻擊方' : '防守方'}) HP:${myHP} 🎲${myDice}<br>` +
    `${opponentName} HP:${opHP} 🎲${opDice}`;
}

function updateBattleLog() {
  document.getElementById('battle-log').innerHTML = '<b>戰鬥紀錄</b><hr>' + battleLogs.join("<hr>");
}

function showGameOptions() {
  updateStatus();
  let cmdArea = document.getElementById('game-container');
  if (myRole === 'atk') {
    let attacks = window.ATTACK_METHODS.slice(0);
    attacks.sort(() => Math.random() - 0.5);
    attacks = attacks.slice(0, 3);
    let str = `<b>${window.LANGS[LANG].chooseAttack}：</b><br>`;
    str += `<div>你的骰子：🎲<b>${myDice}</b></div>`;
    attacks.forEach(a => {
      str += `<button onclick="chooseAtk('${a.id}')">${a.name[LANG]}</button> (${a.desc[LANG]})<br>`;
    });
    cmdArea.innerHTML = str;
    window.chooseAtk = function (methodId) {
      socket.emit("choice", { atkMethod: methodId, atkDice: myDice, role: 'atk', id: myId, name: myName });
      cmdArea.innerHTML = window.LANGS[LANG].waiting;
    };
  } else {
    let str = `<b>${window.LANGS[LANG].chooseDefense}：</b><br>`;
    str += `<div>你的骰子：🎲<b>${myDice}</b></div>`;
    window.DEFENSE_METHODS.forEach(d => {
      str += `<button onclick="chooseDef('${d.id}')">${d.name[LANG]}</button><br>`;
    });
    cmdArea.innerHTML = str;
    window.chooseDef = function (defMethod) {
      socket.emit("choice", { defMethod: defMethod, defDice: myDice, role: 'def', id: myId, name: myName });
      cmdArea.innerHTML = window.LANGS[LANG].waiting;
    };
  }
}

function startGame() {
  round = 1; myHP = 200; opHP = 200; battleLogs = [];
  document.getElementById('game-container').innerHTML = '';
  document.getElementById('status').innerText = '等待分配角色...';
}
