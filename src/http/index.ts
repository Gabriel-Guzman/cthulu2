import express from "express";
import { IExtendedClient } from "../discord/client";
import { CommandDelegationOpts } from "../discord/delegator";
import config from "../config";

type CommandDelegationPayload = {
    command: string;
    opts: CommandDelegationOpts;
};

function buildHttpServer(client: IExtendedClient): express.Application {
    const app: express.Application = express();
    const port = config.http.port;
    app.post("/delegation/command", async (req, res) => {
        const body: CommandDelegationPayload = req.body;
        const command = client.commands.get(body.command);
        if (!command) {
            res.status(404);
            res.send();
        }
        if (command.delegable) {
            try {
                await command.delegable(req.body.opts);
                res.status(200);
                res.send();
            } catch (err) {
                res.status(500);
                res.send({
                    message: err.message,
                    stack: err.stack,
                });
            }
        } else {
            res.status(400);
            res.send("Command is not delegable");
        }
    });

    app.listen(port, () => console.info("HTTP listening on port " + port));
    return app;
}
