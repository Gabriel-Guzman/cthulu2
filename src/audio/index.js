import {
    AQM as aqm,
    YoutubePayload,
    FilePayload,
    UnsearchedYoutubePayload,
} from "./core/Queue.js";
import search from "./core/Search.js";

export const YouTubeAudio = YoutubePayload;
export const File = FilePayload;
export { UnsearchedYoutubePayload };
export const Search = search;
export const AQM = aqm;
