// noinspection HttpUrlsUsage

import { SlashCommandBuilder } from '@discordjs/builders';
import { getAffirmativeDialog } from '../../dialog';
import { findOrCreate, GuildUserInfo, ServerInfo } from '@/db';
// @ts-ignore
import ytdl from 'ytdl-core';
import { ScoMomCommand } from '../types';
import {
    ChatInputCommandInteraction,
    GuildMember,
    InteractionType,
} from 'discord.js';

function isValidHttpUrl(string): boolean {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === 'http:' || url.protocol === 'https:';
}

async function isRealYoutubeUrl(string): Promise<boolean> {
    if (!isValidHttpUrl(string)) return false;

    try {
        const songInfo = await ytdl.getInfo(
            string.replace('https://', 'http://'),
        );
        return !!songInfo;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export default {
    name: 'intro',
    builder: new SlashCommandBuilder()
        .setName('intro')
        .setDescription(
            'Accepts a youtube link. Choose your intro music! (please keep it short)',
        )
        .setDMPermission(false)
        .addStringOption((opt) =>
            opt
                .setName('link')
                .setDescription('the youtube link to play when you join voice')
                .setRequired(true),
        ),
    async execute(client, interaction) {
        if (!(interaction.type === InteractionType.ApplicationCommand)) {
            return;
        }

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const member = <GuildMember>interaction.member;

        const url = interaction.options.getString('link');
        const serverInfo = await findOrCreate(ServerInfo, {
            guildId: interaction.guild.id,
        });
        if (!serverInfo.intros) {
            serverInfo.intros = new Map();
        }
        if (!(await isRealYoutubeUrl(url))) {
            await interaction.reply("i don't think that's a valid link...");
            return;
        }
        serverInfo.intros.set(member.id, url);
        await serverInfo.save();
        const userInfo = await findOrCreate(GuildUserInfo, {
            userId: member.id,
            guildId: interaction.guild.id,
        });
        await interaction.reply(
            getAffirmativeDialog('intro', member, userInfo),
        );
    },
} as ScoMomCommand<ChatInputCommandInteraction>;
