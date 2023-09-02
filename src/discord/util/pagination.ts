import { IExtendedClient } from '@/discord/client';
import { Message } from 'discord.js';

const pagination = async (
    msg: Message,
    pages,
    client: IExtendedClient,
    emojiList = ['◀️', '⏹️', '▶️'],
    timeout = 120000,
) => {
    if (!msg && !msg.channel) throw new Error('Channel is inaccessible.');
    if (!pages) throw new Error('Pages are not given.');

    let page = 0;
    const curPage = await msg.channel.send(
        pages[page].setFooter({
            text: `Page ${page + 1}/${pages.length} `,
            iconURL: msg.author.displayAvatarURL(),
        }),
    );
    for (const emoji of emojiList) await curPage.react(emoji);
    const reactionCollector = curPage.createReactionCollector({
        time: timeout,
        filter: (reaction, user) =>
            emojiList.includes(reaction.emoji.name) && !user.bot,
    });
    reactionCollector.on('collect', (reaction) => {
        reaction.users.remove(msg.author);
        switch (reaction.emoji.name) {
            case emojiList[0]:
                page = page > 0 ? --page : pages.length - 1;
                break;
            case emojiList[1]:
                curPage.reactions.removeAll();
                break;
            case emojiList[2]:
                page = page + 1 < pages.length ? ++page : 0;
                break;
        }
        curPage.edit(
            pages[page].setFooter({
                text: `Page ${page + 1}/${pages.length} `,
                iconURL: msg.author.displayAvatarURL(),
            }),
        );
    });
    reactionCollector.on('end', () => {
        if (curPage.editable) {
            curPage.reactions.removeAll();
        }
    });
    return curPage;
};

export default pagination;
