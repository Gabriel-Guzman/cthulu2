import sample from "lodash/sample.js";
import find from "lodash/find.js";
import { calculateLevel } from "../../levels/index.js";
const affirmativeDefaults = {
    0: [
        "i know you haven't showered",
        "everyone look. _name_ is griefing",
        "ugh not this guy.",
    ],
    5: [
        // tsundere
        "whatever.",
        "fine.",
        "ugh",
        "alright! its done! you happy?",
        "only cause you asked nicely.",
    ],
    10: [
        // extremely neutral
        "i guess so",
        "sure",
        "sounds good",
    ],

    20: [
        // neutral positive
        "oh, gladly",
        "anything you need",
        "at your service!",
    ],
    30: [
        // flirty
        "sure, _name_ ;)",
        "hehe ok :)",
        "you sure you don't need anything else?",
    ],
    40: [
        // comfortable dating
        "ok babe!",
        "sure hun",
        "i love you",
    ],

    50: [
        // honeymoon phase done
        "really again?",
        "it's always you you you",
        "what about what i want?",
    ],
    60: [
        // the first step of rekindling love
        "i guess that would be a good idea",
        "sure, i'd like that",
        "you know what? let's do it",
    ],
    70: [
        // rebirth of love
        "i need you",
        "suck my slab",
        "i'm happy i met you",
    ],
    100: [
        // chaotic horny
        "don't stop i'm gonna cum",
        "**deeper**",
        "finish on my face",
        "let me watch you drink my squirt",
        "daddy",
    ],
};
const handlerSpecificDialogs = {
    queue: {
        default: ["gotcha! added to queue"],
        10: ["yeah i'll queue it"],
        60: ["yeah.. we should listen to music together again"],
    },
};

export function getAffirmativeDialog(handler, user, userInfo) {
    const level = calculateLevel(userInfo.xp);
    const defaultsIndex = find(
        Object.keys(affirmativeDefaults).sort((a, b) => +b - +a),
        function (n) {
            return n < level;
        }
    );

    const defaults = affirmativeDefaults[defaultsIndex];
    const handlerSpecific = handlerSpecificDialogs[defaultsIndex]
        ? handlerSpecificDialogs[defaultsIndex]
        : [];
    return sample(
        defaults
            .concat(handlerSpecific)
            .map((dialog) => dialog.replaceAll("_name_", user))
    );
}
