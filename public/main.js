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

let myName = '';
let opponentName = '';
let players = [];
let gameInited = false;
let myRole = null;
let myHP = 200, opHP = 200, round = 1;
let battleLogs = [];
let myDice = 0, opDice = 0;

document.getElementById('enterGame').onclick = function () {
  myName = document.getElementById('username').value || "Player" + Math.floor(Math.random() * 100);
  Network.setName(myName);
  document.getElementById('login').style.display = 'none';
  document.getElementById('mainGame').style.display = '';
  document.getElementById('status').innerText = window.LANGS[LANG].waiting;
};

function updateStatus() {
  document.getElementById('status').innerHTML = 
    `${myName} (${myRole === 'atk' ? '攻擊方' : '防守方'}) HP:${myHP} 🎲${myDice}<br>` +
    `${opponentName} HP:${opHP} 🎲${opDice}`;
}

function updateBattleLog() {
  document.getElementById('battle-log').innerHTML = '<b>戰鬥紀錄</b><hr>' + battleLogs.join("<hr>");
}

Network.onPlayers(function(list){
  players = list;
  if(players.length == 2 && !gameInited){
    gameInited = true;
    opponentName = players.find(p => p !== myName);
    startGame();
  } else if(players.length < 2){
    document.getElementById('status').innerText = window.LANGS[LANG].noOpponent;
  }
});

Network.onRoleAssign(function(role){
  myRole = role;
  runRound();
});

Network.onBattle(function(choices){
  let myChoice = null, opChoice = null;
  for(const [id, choice] of Object.entries(choices)){
    if(choice.name === myName){
      myChoice = choice;
    }else{
      opChoice = choice;
    }
  }
  if(myRole === 'atk'){
    myDice = myChoice.atkDice;
    opDice = opChoice.defDice;
  } else {
    myDice = myChoice.defDice;
    opDice = opChoice.atkDice;
  }
  updateStatus();

  let resultStr = '';
  if(myRole === 'atk'){
    let atk = window.ATTACK_METHODS.find(x => x.id === myChoice.atkMethod);
    let base = atk.calc(myChoice.atkDice, opChoice.defDice, opChoice.defMethod);
    let def = window.DEFENSE_METHODS.find(x => x.id === opChoice.defMethod);
    let succ = def.success(opChoice.defDice, myChoice.atkDice);
    let dmg = 0;
    resultStr += `【${myName}🎲${myChoice.atkDice} vs ${opponentName}🎲${opChoice.defDice}】<br>`;
    if(opChoice.defMethod === 'counter' && succ){
      resultStr += `${opponentName} 反擊成功，${myName} 受${base}傷害。<br>`;
      myHP -= base;
    }else if(succ){
      dmg = def.resolve(base);
      resultStr += `${opponentName} ${def.name[LANG]}成功，${opponentName} 只受${dmg}傷害。<br>`;
      opHP -= dmg;
    }else{
      resultStr += `${opponentName} 防禦失敗，受${base}傷害。<br>`;
      opHP -= base;
    }
  }else{
    let atk = window.ATTACK_METHODS.find(x => x.id === opChoice.atkMethod);
    let base = atk.calc(opChoice.atkDice, myChoice.defDice, myChoice.defMethod);
    let def = window.DEFENSE_METHODS.find(x => x.id === myChoice.defMethod);
    let succ = def.success(myChoice.defDice, opChoice.atkDice);
    let dmg = 0;
    resultStr += `【${opponentName}🎲${opChoice.atkDice} vs ${myName}🎲${myChoice.defDice}】<br>`;
    if(myChoice.defMethod === 'counter' && succ){
      resultStr += `${myName} 反擊成功，${opponentName} 受${base}傷害。<br>`;
      opHP -= base;
    }else if(succ){
      dmg = def.resolve(base);
      resultStr += `${myName}${def.name[LANG]}成功，只受${dmg}傷害。<br>`;
      myHP -= dmg;
    }else{
      resultStr += `${myName} 防禦失敗，受${base}傷害。<br>`;
      myHP -= base;
    }
  }
  battleLogs.push(`第${round}回合：<br>`+resultStr);
  updateBattleLog();

  setTimeout(() => {
    if(myHP <= 0 || opHP <= 0){
      document.getElementById('status').innerHTML += "<br>" + window.LANGS[LANG].battleLog;
    }else{
      round++;
      runRound();
    }
  }, 3000);
});

function startGame(){
  round = 1; myHP = 200; opHP = 200; battleLogs = [];
  myDice = 0; opDice = 0;
  updateStatus();
  runRound();
}

function runRound(){
  let dice = Math.floor(Math.random() * 6 + 1) + Math.floor(Math.random() * 6 + 1);
  if(myRole === 'atk'){
    myDice = dice;
    const cmdArea = document.getElementById('game-container');
    let attacks = window.ATTACK_METHODS.slice(0);
    attacks.sort(() => Math.random() - 0.5);
    attacks = attacks.slice(0, 3);
    let str = `<b>${window.LANGS[LANG].chooseAttack}：</b><br>`;
    str += `<div>你的骰子：🎲<b>${dice}</b></div>`;
    attacks.forEach((a) => {
      str += `<button onclick="chooseAtk('${a.id}',${dice})">${a.name[LANG]}</button> (${a.desc[LANG]})<br>`;
    });
    cmdArea.innerHTML = str;
    window.chooseAtk = function (methodId, diceVal) {
      Network.sendChoice({ name: myName, role: 'atk', atkMethod: methodId, atkDice: diceVal });
      cmdArea.innerHTML = window.LANGS[LANG].waiting;
    };
  } else if(myRole === 'def'){
    myDice = dice;
    const cmdArea = document.getElementById('game-container');
    let str = `<b>${window.LANGS[LANG].chooseDefense}：</b><br>`;
    str += `<div>你的骰子：🎲<b>${dice}</b></div>`;
    window.DEFENSE_METHODS.forEach((d) => {
      str += `<button onclick="chooseDef('${d.id}',${dice})">${d.name[LANG]}</button><br>`;
    });
    cmdArea.innerHTML = str;
    window.chooseDef = function (defMethod, diceVal) {
      Network.sendChoice({ name: myName, role: 'def', defMethod: defMethod, defDice: diceVal });
      cmdArea.innerHTML = window.LANGS[LANG].waiting;
    };
  }
}
