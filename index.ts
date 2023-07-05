import 'module-alias/register';
import * as dotenv from 'dotenv';
import scoMom from '@/discord';

import { generateDependencyReport } from '@discordjs/voice';

export function config() {
    dotenv.config({
        path: process.env.NODE_DEV === 'true' ? '.dev.env' : '.env',
    });
}

config();

console.log(generateDependencyReport());
scoMom().then(() => console.log('scomom initialized'));
