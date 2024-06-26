import search from 'youtube-search';
import util from 'util';

class Search {
    key: string;
    maxResults: number;
    constructor(key, maxResults) {
        this.key = key;
        this.maxResults = maxResults;
    }

    search(query, opts) {
        return util.promisify(search)(query, {
            key: this.key,
            maxResults: this.maxResults,
            ...opts,
        });
    }
}

export default {
    async search(query, opts) {
        const s = new Search(process.env.YOUTUBE_API_KEY, 10);
        return s.search(query, opts);
    },

    async searchVideos(query) {
        return await this.search(query, {
            type: 'video',
        });
    },
};
