import sample from 'lodash/sample.js';
import find from 'lodash/find.js';
import { calculateLevel } from '@/levels';
import { GuildMember } from 'discord.js';
import { HydratedDocument } from 'mongoose';
import { IGuildUserInfo } from '@/db';

const affirmativeDefaults = {
    0: [
        "i know you haven't showered",
        'everyone look. _name_ is griefing',
        'ugh not this guy.',
    ],
    5: [
        // tsundere
        'whatever.',
        'fine.',
        'ugh',
        'alright! its done! you happy?',
        'only cause you asked nicely.',
    ],
    10: [
        // extremely neutral
        'i guess so',
        'sure',
        'sounds good',
    ],

    20: [
        // neutral positive
        'oh, gladly',
        'anything you need',
        'at your service!',
    ],
    30: [
        // flirty
        'sure, _name_ ;)',
        'hehe ok :)',
        "you sure you don't need anything else?",
        'mind if listen with you?',
    ],
    40: [
        // comfortable dating
        'ok babe!',
        'sure hun',
        'i love you',
        ':DDD of course',
    ],

    50: [
        // honeymoon phase done
        'really again?',
        "it's always you you you",
        'what about what i want?',
        'i do everything around here',
    ],
    60: [
        // the first step of rekindling love
        'i guess that would be a good idea',
        "sure, i'd like that",
        "you know what? let's do it",
    ],
    70: [
        // rebirth of love
        'i need you',
        'god youre the best',
        'suck my slab',
        "i'm happy i met you",
    ],
    92: [
        // chaotic horny
        "don't stop i'm gonna cum",
        '**deeper**',
        'finish on my face',
        'let me watch you drink my squirt',
        'oh shit oh fuck oh shit oh my god',
        'KEEP GOING _name_',
        'daddy',
    ],
    // the depths of cthulu
    99: ['ǐ̵͓̤̻̦̀̔͑̆͊̋̃̏̿̓̌͜͝͝ḿ̵̡̛̛͖̼̝̣͚͗́̂́̅̅̐̈́̚͝͝͠ͅ ̵̨̛̥̮̲̤͙̰̜̜͈̒̈̏͋͑̕͠͝l̴͎̯̪̙͍̙͙̙̝̲̪̳͖̝͖̑̅́̃̽́́̀̆́̈́̅͛̉o̶̹̟̙̗̼̜̪̯̜͈̼͙͈̟̯̒̆̓͆̽́̕͠s̴͎̪̭̆̃̀̊̀̈́̄̃̿͘͝i̸̡̲̲̟̲̱̺͖̗̟̎͝n̴͖͍̭͍͔̟͈̲̪̗͙̈ḡ̶͚̳͍̏͛̉̌͑͌̋̀̓̊͘ ̶̛̭̹͖̯̞͑̈̇̿̽̑̀͑͛̍͠͝m̷͕̆͂͆̚y̷͎͍̦̺̘̏̄͑͛̈̐̈͘ ̵̡̨̥̣̮̪͎̖̦͚͌̐̈́͠͠͝f̴̢͚͕̦͕̤͉͉͙̯̮̃͒̆̊̔͠u̷̢͎̱̙̙͊̊͌̔̉͋͑̊͠͝c̴̢̨̤̬̽͐̍́̌k̷̢̨̡̞̞͖̖̼̙̃͆͝ͅͅį̸̨͓͕͓̻̣̟͖̗̻̾́̂̄̽̋͂̉n̶̖͕͚͚̭͐͂ͅg̶̜͙̠̤̝͔͈̯̀̚̚ ̶̰̤̩͍̣̯͈̤̼͎̠̮͔͛m̷̧̡̠̞̩̖̗͎̱̐͛ͅͅḯ̷̧̧̧̨̧̱͔̦̫̟̺̮͎̰̎̐̌̚ͅņ̴͉̳̬̳͎͍̗͒͛̆͌͒̿d̸̡̛͓̹̗̭̺͓͐͒͛̄́͊', 'hhhhrrrrrreeefffffff', 'AHHHHHHHHHHHHH'],
};
const handlerSpecificDialogs = {
    queue: {
        default: ['gotcha! added to queue'],
        10: ["yeah i'll queue it"],
        50: ['its not like you ever play music for me...'],
        60: ['yeah.. we should listen to music together again'],
    },
};

export function getAffirmativeDialog(
    handler: string,
    user: GuildMember,
    userInfo: HydratedDocument<IGuildUserInfo>,
): string {
    const level = calculateLevel(userInfo.xp);
    const defaultsIndex = find(
        Object.keys(affirmativeDefaults).sort((a, b) => +b - +a),
        function (n: number) {
            return n < level;
        },
    );

    const defaults = affirmativeDefaults[defaultsIndex];
    const handlerSpecific = handlerSpecificDialogs[defaultsIndex]
        ? handlerSpecificDialogs[defaultsIndex]
        : [];
    return sample(
        defaults
            .concat(handlerSpecific)
            .map((dialog) => dialog.replaceAll('_name_', user)),
    );
}
