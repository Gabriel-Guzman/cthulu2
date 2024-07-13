import search, { YouTubeSearchOptions } from 'youtube-search';
import util from 'util';

class Search {
    key: string;
    maxResults: number;
    constructor(key: string, maxResults: number) {
        this.key = key;
        this.maxResults = maxResults;
    }

    search(query: string, opts: YouTubeSearchOptions) {
        return util.promisify(search)(query, {
            key: this.key,
            maxResults: this.maxResults,
            ...opts,
        });
    }
}

export default {
    async search(query: string, opts: YouTubeSearchOptions) {
        const s = new Search(process.env.YOUTUBE_API_KEY, 10);
        return s.search(query, opts);
    },

    async searchVideos(query: string) {
        return await this.search(query, {
            type: 'video',
        });
    },
};
