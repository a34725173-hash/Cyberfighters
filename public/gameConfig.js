window.ATTACK_METHODS = [
  { id heavy_punch, name { zh 重拳, en Heavy Punch }, desc { zh 傷害=骰2 (必中), en Damage=Dice2 (Always Hit) }, calc (dice, opDice) = Math.floor(dice2) },
  { id leg_kick, name { zh 腿踢, en Leg Kick }, desc { zh 傷害=骰3 (閃避減對方骰5), en Damage=Dice3 (Dodge -Opponent Dice5) },
    calc (dice, opDice, defense) = { let base = dice3; if (defense===dodge) return Math.max(0, base - opDice5); return base; }
  },
  { id takedown, name { zh 摔技, en Takedown }, desc { zh 骰對方才命中，傷害=骰+10, en DiceOpponent Damage=Dice+10 }, calc (dice, opDice) = (diceopDice)(dice+10)0 },
  { id clinch_knee, name { zh 纏抱膝撞, en Clinch Knee }, desc { zh 傷害=骰2+5 (必中), en Damage=Dice2+5 (Always Hit) }, calc (dice)=dice2+5 },
  { id submission, name { zh 降伏技, en Submission }, desc { zh 傷害=骰4 (高風險), en Damage=Dice4 (Risk) }, calc (dice)=dice4 },
  { id ground_pound, name { zh 地面重擊, en Ground Pound }, desc { zh 骰對方才命中，傷害=骰+15, en DiceOpponent Damage=Dice+15 }, calc (dice, opDice) = (diceopDice)(dice+15)0 }
];

window.DEFENSE_METHODS = [
  { id block, name { zh 防禦, en Block }, success (defDice, atkDice) = defDice  atkDice, effect 減半, resolve (dmg)=Math.floor(dmg2) },
  { id dodge, name { zh 閃避, en Dodge }, success (defDice, atkDice) = (defDice-5)atkDice, effect 無傷害, resolve ()=0 },
  { id counter, name { zh 反擊, en Counter }, success (defDice, atkDice) = Math.floor(defDice2)atkDice, effect 反彈, resolve (dmg)=({ reflectdmg }) }
];
