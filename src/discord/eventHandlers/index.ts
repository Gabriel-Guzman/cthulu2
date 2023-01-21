import handleGuildMemberAdd from "./guildMemberAdd";
import handleInteractionCreate from "./interactionCreate";
import handleMessageCreate from "./messageCreate";
import handleMessageReactionAdd from "./messageReactionAdd";

export default {
    guildMemberAdd: handleGuildMemberAdd,
    interactionCreate: handleInteractionCreate,
    messageCreate: handleMessageCreate,
    messageReactionAdd: handleMessageReactionAdd,
};
