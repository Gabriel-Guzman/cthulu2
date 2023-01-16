import scoMom from "./src/discord/index.js";
import * as dotenv from 'dotenv';

dotenv.config({
  path: process.env.DEV ? './.dev.env' : './.env'
})
scoMom();