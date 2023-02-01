import { AQM } from '@/audio/aqm';

describe('AudioQueueManager', () => {
    describe('queue', () => {
        it('should add a song to the queue', () => {
            jest.spyOn(AQM, 'queue');
        });
    });
});
