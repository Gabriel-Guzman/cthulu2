
export const xpLevelIncrease = Math.pow(2, 1 / 7);
const initalXp = 83;

// xp = initalXp * (2^(1/7))^level

export function calculateXp(level) {
  return Math.pow(xpLevelIncrease, level - 1) * initalXp;
}

// inverse of calculateXp(level)
export function calculateLevel(xp) {
  return Math.floor(Math.log(xp / initalXp) / Math.log(xpLevelIncrease) + 1);
}

