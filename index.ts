import scoMom from "./src/discord/index.js";
import * as dotenv from "dotenv";

export function config() {
    dotenv.config({
        path: process.env.NODE_DEV === "true" ? "./.dev.env" : "./.env",
    });
}

config();

scoMom();
