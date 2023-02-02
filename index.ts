import 'module-alias/register';
import * as dotenv from 'dotenv';
import scoMom from '@/discord';

export function config() {
    dotenv.config({
        path: process.env.NODE_DEV === 'true' ? '.dev.env' : '.env',
    });
}

config();

scoMom().then(() => console.log('scomom initialized'));
