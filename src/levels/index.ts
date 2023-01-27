import { HydratedDocument } from "mongoose";
import { IGuildUserInfo } from "../db";
import { GuildMember, GuildTextBasedChannel } from "discord.js";

export const xpLevelIncrease = Math.pow(2, 1 / 7);

// NEVER CHANGE THIS
const initalXp = 83;

// xp = initalXp * (2^(1/7))^level

export function calculateXp(level: number): number {
    return Math.pow(xpLevelIncrease, level - 1) * initalXp;
}

// inverse of calculateXp(level)
export function calculateLevel(xp: number): number {
    if (xp < initalXp) throw new Error("xp must be >= initialXp");
    return Math.floor(Math.log(xp / initalXp) / Math.log(xpLevelIncrease) + 1);
}

// increments a users level in the db
export async function incrementUserXp(
    userInfo: HydratedDocument<IGuildUserInfo>,
    member: GuildMember,
    channel: GuildTextBasedChannel,
    amountToAdjust: number
): Promise<void> {
    userInfo.xp = userInfo.xp + amountToAdjust;

    const currentLevel = calculateLevel(userInfo.xp);
    if (currentLevel > userInfo.lastLevelCongratulated) {
        userInfo.lastLevelCongratulated = currentLevel;
        await channel.send(
            `🙌🎉🎊🥂 🙌🎉🎊🥂 ${member} you're SCO level ${currentLevel} now! 🙌🎉🎊🙌🎉🎊🥂🥂`
        );
    }

    await userInfo.save();
}
