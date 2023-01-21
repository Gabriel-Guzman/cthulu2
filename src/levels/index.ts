import { HydratedDocument } from "mongoose";
import { IGuildUserInfo } from "../db";
import { GuildMember, GuildTextBasedChannel } from "discord.js";

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

export const xpGainCommand = {
    queue: 10,
};

export const xpGainEvent = {
    messageCreate: 5,
};

// increments a users level in the db
export async function incrementUserXp(
    userInfo: HydratedDocument<IGuildUserInfo>,
    member: GuildMember,
    channel: GuildTextBasedChannel,
    amountToAdjust: number
): Promise<void> {
    console.log("incrementUserLevel called");

    userInfo.xp = userInfo.xp + amountToAdjust;
    await userInfo.save();

    const currentLevel = calculateLevel(userInfo.xp);
    if (currentLevel > userInfo.lastLevelCongratulated) {
        userInfo.lastLevelCongratulated = currentLevel;
        await userInfo.save();

        console.log("user leveled up");
        await channel.send(
            `🙌🎉🎊🥂 🙌🎉🎊🥂 ${member} you're SCO level ${currentLevel} now! 🙌🎉🎊🙌🎉🎊🥂🥂`
        );
    }
}
