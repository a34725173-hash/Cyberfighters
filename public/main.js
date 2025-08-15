let LANG = 'zh';
window.setLang = function (l) {
  LANG = l;
  setText();
};
function setText() {
  document.getElementById('title').innerText = window.LANGS[LANG].title;
  document.getElementById('enterNameLabel').innerText = window.LANGS[LANG].enterName;
  document.getElementById('enterGame').innerText = window.LANGS[LANG].enterGame;
}
setText();

let myName = '';
let opponentName = '';
let players = [];
let gameInited = false;
let myRole = null;
let myHP = 200,
  opHP = 200,
  round = 1;
let battleLogs = [];

document.getElementById('enterGame').onclick = function () {
  myName = document.getElementById('username').value || "Player" + Math.floor(Math.random() * 100);
  Network.setName(myName);
  document.getElementById('login').style.display = 'none';
  document.getElementById('mainGame').style.display = '';
  document.getElementById('status').innerText = window.LANGS[LANG].waiting;
};

function updateStatus() {
  document.getElementById('status').innerText =
    `${myName} (${myRole === 'atk' ? '攻擊方' : '防守方'}) HP:${myHP}  |  ${opponentName} HP:${opHP}`;
}

Network.onPlayers(function (list) {
  players = list;
  if (players.length == 2 && !gameInited) {
    gameInited = true;
    opponentName = players.find(p => p !== myName);
    startGame();
  } else if (players.length < 2) {
    document.getElementById('status').innerText = window.LANGS[LANG].noOpponent;
  }
});

Network.onRoleAssign(function (role) {
  myRole = role;
  updateStatus();
  runRound();
});

Network.onBattle(function (choices) {
  let [a, b] = Object.values(choices);
  let resultStr = '';
  if (a.role === 'atk') {
    let atk = window.ATTACK_METHODS.find(x => x.id === a.atkMethod);
    let base = atk.calc(a.atkDice, b.defDice, b.defMethod);
    let def = window.DEFENSE_METHODS.find(x => x.id === b.defMethod);
    let succ = def.success(b.defDice, a.atkDice);
    let dmg = 0;
    if (b.defMethod == 'counter' && succ) {
      resultStr += `${opponentName} 反擊成功，你受${base}傷害。<br>`;
      myHP -= base;
    } else if (succ) {
      dmg = def.resolve(base);
      resultStr += `${opponentName} ${def.name[LANG]}成功，你只受${dmg}傷害。<br>`;
      opHP -= dmg;
    } else {
      resultStr += `${opponentName} 防禦失敗，受${base}傷害。<br>`;
      opHP -= base;
    }
  } else {
    let atk = window.ATTACK_METHODS.find(x => x.id === b.atkMethod);
    let base = atk.calc(b.atkDice, a.defDice, a.defMethod);
    let def = window.DEFENSE_METHODS.find(x => x.id === a.defMethod);
    let succ = def.success(a.defDice, b.atkDice);
    let dmg = 0;
    if (a.defMethod == 'counter' && succ) {
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
  battleLogs.push(resultStr);
  document.getElementById('game-container').innerHTML = battleLogs.join("<hr>");
  updateStatus();

  setTimeout(() => {
    if (myHP <= 0 || opHP <= 0) {
      document.getElementById('status').innerText = window.LANGS[LANG].battleLog;
    } else {
      round++;
      runRound();
    }
  }, 3000);
});

function startGame() {
  round = 1;
  myHP = 200;
  opHP = 200;
  battleLogs = [];
  document.getElementById('status').innerText = window.LANGS[LANG].round.replace('{0}', round);
  runRound();
}

function runRound() {
  updateStatus();
  const cmdArea = document.getElementById('game-container');
  cmdArea.innerHTML = '';
  let dice = Math.floor(Math.random() * 6 + 1) + Math.floor(Math.random() * 6 + 1);
  if (myRole === 'atk') {
    let attacks = window.ATTACK_METHODS.slice(0);
    attacks.sort(() => Math.random() - 0.5);
    attacks = attacks.slice(0, 3);
    let str = `<b>${window.LANGS[LANG].chooseAttack}：</b><br>`;
    attacks.forEach((a) => {
      str += `<button onclick="chooseAtk('${a.id}',${dice})">${a.name[LANG]}</button> (${a.desc[LANG]})<br>`;
    });
    cmdArea.innerHTML = str;
    window.chooseAtk = function (methodId, diceVal) {
      Network.sendChoice({ role: 'atk', atkMethod: methodId, atkDice: diceVal });
      cmdArea.innerHTML = window.LANGS[LANG].waiting;
    };
  } else if (myRole === 'def') {
    let str = `<b>${window.LANGS[LANG].chooseDefense}：</b><br>`;
    window.DEFENSE_METHODS.forEach((d) => {
      str += `<button onclick="chooseDef('${d.id}',${dice})">${d.name[LANG]}</button><br>`;
    });
    cmdArea.innerHTML = str;
    window.chooseDef = function (defMethod, diceVal) {
      Network.sendChoice({ role: 'def', defMethod: defMethod, defDice: diceVal });
      cmdArea.innerHTML = window.LANGS[LANG].waiting;
    };
  }
}
