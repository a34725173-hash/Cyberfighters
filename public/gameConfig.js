window.ATTACK_METHODS = [
  {
    id: "heavy_punch",
    name: { zh: "重拳", en: "Heavy Punch" },
    desc: { zh: "傷害=骰/2 (必中)", en: "Damage = Dice / 2 (Always Hit)" },
    calc: function(dice, opDice) { return Math.floor(dice / 2); }
  },
  {
    id: "leg_kick",
    name: { zh: "腿踢", en: "Leg Kick" },
    desc: { zh: "傷害=骰*3 (閃避減對方骰*5)", en: "Damage = Dice * 3 (Dodge penalty opponent dice*5)" },
    calc: function(dice, opDice, defense) {
      let base = dice * 3;
      if (defense === "dodge") return Math.max(0, base - opDice * 5);
      return base;
    }
  },
  {
    id: "takedown",
    name: { zh: "摔技", en: "Takedown" },
    desc: { zh: "骰子高過對方才命中，傷害=骰+10", en: "Dice > Opponent dice: Damage = Dice + 10" },
    calc: function(dice, opDice) {
      return dice > opDice ? dice + 10 : 0;
    }
  },
  {
    id: "clinch_knee",
    name: { zh: "纏抱膝撞", en: "Clinch Knee" },
    desc: { zh: "傷害=骰*2+5 (必中)", en: "Damage = Dice * 2 + 5 (Always Hit)" },
    calc: function(dice) { return dice * 2 + 5; }
  },
  {
    id: "submission",
    name: { zh: "降伏技", en: "Submission" },
    desc: { zh: "傷害=骰*4 (高風險)", en: "Damage = Dice * 4 (High Risk)" },
    calc: function(dice) { return dice * 4; }
  },
  {
    id: "ground_pound",
    name: { zh: "地面重擊", en: "Ground Pound" },
    desc: { zh: "骰子高過對方才命中，傷害=骰+15", en: "Dice > Opponent dice: Damage = Dice + 15" },
    calc: function(dice, opDice) {
      return dice > opDice ? dice + 15 : 0;
    }
  }
];

window.DEFENSE_METHODS = [
  {
    id: "block",
    name: { zh: "防禦", en: "Block" },
    success: function(defDice, atkDice) { return defDice > atkDice; },
    effect: "減半",
    resolve: function(dmg) { return Math.floor(dmg / 2); }
  },
  {
    id: "dodge",
    name: { zh: "閃避", en: "Dodge" },
    success: function(defDice, atkDice) { return (defDice - 5) > atkDice; },
    effect: "無傷害",
    resolve: function() { return 0; }
  },
  {
    id: "counter",
    name: { zh: "反擊", en: "Counter" },
    success: function(defDice, atkDice) { return Math.floor(defDice / 2) > atkDice; },
    effect: "反彈",
    resolve: function(dmg) { return { reflect: dmg }; }
  }
];
