import { Server } from 'socket.io';
import { createServer } from 'http';
import {
    ClientToServerEvents,
    InterServerEvents,
    Questions,
    ServerToClientEvents,
    SocketData,
} from '@/cluster/types';
import { ChildNodeResponse } from '@/discord/commands/types';
import { InteractionCreateCtx } from '@/discord/eventHandlers/interactionCreate';
import { lock } from '@/helpers/locks';
import { APIBasePayload } from '@/discord/commands/payload';

type DelegationResponse = {
    responder?: string;
} & ChildNodeResponse;

export class ClusterMotherManager {
    io: Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >;

    constructor(
        io: Server<ClientToServerEvents, ServerToClientEvents, SocketData>,
    ) {
        this.io = io;

        io.on('connection', function (socket) {
            console.log('new socket connection' + socket.id);

            socket.on(Questions.REPORT_TO_MOM, (clientId) => {
                socket.join(clientId);
            });
        });
    }

    // sends command to a random child
    async delegate(
        ctx: InteractionCreateCtx,
        commandName: string,
        payload: APIBasePayload,
    ): Promise<DelegationResponse> {
        // need to lock
        console.debug('delegating');
        const release = await lock(ctx.redis, payload.guildId);

        console.debug('acquired lock');
        const responses = await this.io
            .timeout(3000)
            .emitWithAck(Questions.CAN_EXECUTE, {
                ...payload,
                name: commandName,
            });

        console.debug('received ' + responses);

        const yesIds = responses.filter((response) => response.length);
        if (!yesIds.length) {
            return {
                success: false,
                message: 'no childs could execute. add more bots!',
            };
        }

        const randomNode = yesIds[Math.floor(Math.random() * responses.length)];

        console.debug('requesting execute from ', randomNode);
        const [res] = await this.io
            .to(randomNode)
            .timeout(3000)
            .emitWithAck(Questions.EXECUTE, {
                ...payload,
                name: commandName,
            });
        console.debug('received', res);
        release();
        console.debug('releaded lock');
        return {
            ...res,
            responder: randomNode,
        };
    }
}

export function buildMotherServer(): ClusterMotherManager {
    const httpServer = createServer();
    const io = new Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >(httpServer);

    httpServer.listen(3000);
    return new ClusterMotherManager(io);
}
