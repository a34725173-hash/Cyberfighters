let LANG = 'zh';
window.setLang = function(l) {
  LANG = l; setText();
};
function setText() {
  document.getElementById('title').innerText = window.LANGS[LANG].title;
  document.getElementById('enterNameLabel').innerText = window.LANGS[LANG].enterName;
  document.getElementById('enterGame').innerText = window.LANGS[LANG].enterGame;
}
setText();

let myName = '';
let players = [];
let gameInited = false;

document.getElementById('enterGame').onclick = function() {
  myName = document.getElementById('username').value || "Player"+Math.floor(Math.random()*100);
  Network.setName(myName);
  document.getElementById('login').style.display = 'none';
  document.getElementById('mainGame').style.display = '';
  document.getElementById('status').innerText = window.LANGS[LANG].waiting;
};

Network.onPlayers(function(list){
  players = list;
  if (players.length==2 && !gameInited) {
    gameInited = true;
    startGame();
  } else if (players.length<2) {
    document.getElementById('status').innerText = window.LANGS[LANG].noOpponent;
  }
});

let myHP = 200, opHP = 200, round=1, isMyTurn=false;
function startGame() {
  round = 1; myHP = 200; opHP = 200;
  document.getElementById('status').innerText = window.LANGS[LANG].round.replace('{0}', round);
  runRound();
}

function runRound() {
  document.getElementById('status').innerText = window.LANGS[LANG].round.replace('{0}',round) + 
    ' ' + window.LANGS[LANG].yourHP+':'+myHP+' ' + window.LANGS[LANG].opponentHP+':'+opHP;
  // 決定攻防, 隨機給自己攻/防
  let role = Math.random() < 0.5 ? 'atk':'def';
  let cmdArea = document.getElementById('game-container');
  cmdArea.innerHTML = '';
  let dice = Math.floor(Math.random()*6+1) + Math.floor(Math.random()*6+1);

  if (role==='atk') {
    let attacks = window.ATTACK_METHODS.slice(0); // 6選3
    attacks.sort(()=>Math.random()-0.5);
    attacks=attacks.slice(0,3);
    let str = `<b>${window.LANGS[LANG].chooseAttack}：</b><br>`;
    attacks.forEach(a => {
      str += `<button onclick="chooseAtk('${a.id}',${dice})">${a.name[LANG]}</button> (${a.desc[LANG]})<br>`;
    });
    cmdArea.innerHTML = str;
    window.chooseAtk = function(methodId, diceVal){
      Network.sendChoice({ role:'atk', atkMethod:methodId, atkDice:diceVal });
      cmdArea.innerHTML = window.LANGS[LANG].waiting;
    }
  } else {
    let str = `<b>${window.LANGS[LANG].chooseDefense}：</b><br>`;
    window.DEFENSE_METHODS.forEach(d=>{
      str += `<button onclick="chooseDef('${d.id}',${dice})">${d.name[LANG]}</button><br>`;
    });
    cmdArea.innerHTML = str;
    window.chooseDef = function(defMethod, diceVal){
      Network.sendChoice({ role:'def', defMethod:defMethod, defDice:diceVal });
      cmdArea.innerHTML = window.LANGS[LANG].waiting;
    }
  }
}

// battle 結果
Network.onBattle(function(choices){
  // 簡化為：自己永遠為A, 對手為B
  let [a,b] = Object.values(choices);
  let resultStr = '';
  if (a.role==='atk') {
    // a攻b防
    let atk = window.ATTACK_METHODS.find(x=>x.id===a.atkMethod);
    let base = atk.calc(a.atkDice, b.defDice, b.defMethod);

    let def = window.DEFENSE_METHODS.find(x=>x.id===b.defMethod);
    let succ = def.success(b.defDice, a.atkDice);
    let dmg=0, reflect=0;
    if (b.defMethod=='counter' && succ) {
      resultStr += '對手反擊成功，你受'+base+'傷害。<br>';
      myHP -= base;
    } else if (succ) {
      dmg = def.resolve(base);
      resultStr += '對手'+def.name[LANG]+'成功，你只受'+dmg+'傷害。<br>';
      opHP -= dmg;
    } else {
      resultStr += '對手防禦失敗，受'+base+'傷害。<br>';
      opHP -= base;
    }
  } else {
    // b攻a防（對方攻你防）
    let atk = window.ATTACK_METHODS.find(x=>x.id===b.atkMethod);
    let base = atk.calc(b.atkDice, a.defDice, a.defMethod);

    let def = window.DEFENSE_METHODS.find(x=>x.id===a.defMethod);
    let succ = def.success(a.defDice, b.atkDice);
    let dmg=0, reflect=0;
    if (a.defMethod=='counter' && succ) {
      resultStr += '你反擊成功，對手受'+base+'傷害。<br>';
      opHP -= base;
    } else if (succ) {
      dmg = def.resolve(base);
      resultStr += '你'+def.name[LANG]+'成功，只受'+dmg+'傷害。<br>';
      myHP -= dmg;
    } else {
      resultStr += '防禦失敗，你受'+base+'傷害。<br>';
      myHP -= base;
    }
  }

  // 檢查勝負
  if (myHP <= 0 && opHP <= 0) resultStr+= window.LANGS[LANG].draw;
  else if (myHP <= 0) resultStr+= window.LANGS[LANG].lose;
  else if (opHP <= 0) resultStr+= window.LANGS[LANG].win;

  document.getElementById('game-container').innerHTML = resultStr;
  setTimeout(()=>{
    if (myHP<=0 || opHP<=0) {
      document.getElementById('status').innerText = window.LANGS[LANG].battleLog;
    } else {
      round++;
      runRound();
    }
  }, 2000);
});
