import {
    DelegationRole,
    IInstanceInfo,
    InstanceInfo,
} from "../../db/delegating";
import { IExtendedClient } from "../client";
import { HydratedDocument } from "mongoose";
import fetch from "node-fetch";
import config from "../../config";
import { ClientEvents } from "discord.js";
import { BaseQueueCommandOpts } from "../commands/music/queue";

type CommandDelegationOpts = {
    command: string;
} & BaseQueueCommandOpts;

export class DelegationService {
    role: DelegationRole;
    instances: Array<HydratedDocument<IInstanceInfo>> = [];
    client: IExtendedClient;
    disabled: boolean;
    constructor(client: IExtendedClient) {
        this.client = client;

        // decide if we are delegator, delegate, or disabled
        if (config.delegation.role) {
            this.role =
                config.delegation.role === "DELEGATOR"
                    ? "DELEGATOR"
                    : "DELEGATE";
        } else {
            this.disabled = true;
        }

        if (this.disabled) {
            return;
        }
    }

    async init(): Promise<void> {
        if (this.disabled) return;

        let instance = await InstanceInfo.findOne({
            clientId: this.client.user.id,
        });
        if (instance) {
            instance.role = this.role;
            instance.port = config.http.port;
            await instance.save();
        } else {
            await InstanceInfo.create({
                clientUserId: this.client.user.id,
                role: this.role,
                active: false,
                port: process.env.PORT,
            });
        }
        this.instances = await InstanceInfo.find({
            role: "DELEGATE",
            active: true,
        });
    }

    async getDelegateByRule(
        delegatePicker: (IInstanceInfo) => boolean
    ): Promise<HydratedDocument<IInstanceInfo> | undefined> {
        return this.instances.find((instance) =>
            delegatePicker(instance.toObject())
        );
    }

    async dispatchCommand(opts: CommandDelegationOpts) {}

    async dispatch(event: ClientEvents, opts) {}

    function;
}

// export type CommandDelegationOpts = BaseQueueCommandOpts;

export default DelegationService;
