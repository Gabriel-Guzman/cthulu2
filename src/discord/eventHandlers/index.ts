import handleGuildMemberAdd from "./guildMemberAdd";
import handleInteractionCreate from "./interactionCreate";
import handleMessageCreate from "./messageCreate";
import handleMessageReactionAdd from "./messageReactionAdd";
import handleVoiceStateUpdate from "./voiceStateUpdate";

export default {
    guildMemberAdd: handleGuildMemberAdd,
    interactionCreate: handleInteractionCreate,
    messageCreate: handleMessageCreate,
    messageReactionAdd: handleMessageReactionAdd,
    voiceStateUpdate: handleVoiceStateUpdate,
};
