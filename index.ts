import scoMom from '@/discord';
import http from '@/http';
import * as dotenv from 'dotenv';

export function config() {
    dotenv.config({
        path: process.env.NODE_DEV === 'true' ? '.dev.env' : '.env',
    });
}

config();

async function run() {
    await scoMom().then(() => console.log('scomom initialized'));
    http.listen(+process.env.PORT as number, () => {
        console.log(`listening on port ${process.env.PORT}`);
    });
    http.get('/updatime', (_, res) => {
        res.send('up');
    });
}

run().then(() => console.log('Cthulu up'));
