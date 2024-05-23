import { Server } from 'socket.io';
import { createServer } from 'http';
import {
    ClientToServerEvents,
    ClusterRequest,
    InterServerEvents,
    ServerToClientEvents,
    SocketData,
} from '@/cluster/types';
import { ClusterableCommandResponse } from '@/discord/commands/types';
import {
    CommandBaseMinimumPayload,
    VoiceStateBaseMinimumPayload,
} from '@/discord/commands/payload';
import { Context } from '@/discord';
import config from '@/config';
import Checkout from '@/helpers/queue';

type DelegationResponse = {
    responder?: string;
} & ClusterableCommandResponse;

export class ClusterMotherManager {
    io: Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >;

    checkout: Checkout = new Checkout();

    constructor(
        io: Server<ClientToServerEvents, ServerToClientEvents, SocketData>,
    ) {
        this.io = io;

        io.on('connection', function (socket) {
            console.log('new socket connection' + socket.id);
            socket.on(ClusterRequest.REPORT_TO_MOM, (clientId) => {
                socket.join(clientId);
            });
        });
    }

    // sends command to a random child
    async delegate(
        ctx: Context,
        namespace: string,
        action: string,
        payload: CommandBaseMinimumPayload | VoiceStateBaseMinimumPayload,
        checkoutLane = 'global',
    ): Promise<DelegationResponse> {
        console.debug('delegating');
        return this.checkout.placeOrder(checkoutLane, async () => {
            console.time('delegation');
            console.time('can_execute');
            const responses = await this.io
                .timeout(config.clustering.childMessageTimeout)
                .emitWithAck(ClusterRequest.CAN_EXECUTE, {
                    ...payload,
                    namespace,
                    name: action,
                });

            console.timeEnd('can_execute');
            console.debug('received ' + responses);

            const yesIds = responses.filter((response) => response.length);
            if (!yesIds.length) {
                return {
                    success: false,
                    message: 'no childs could execute. add more bots!',
                };
            }

            const randomNode =
                yesIds[Math.floor(Math.random() * yesIds.length)];

            console.time('execute');
            console.debug('requesting execute from ', randomNode);
            const [res] = await this.io
                .to(randomNode)
                .timeout(config.clustering.childMessageTimeout)
                .emitWithAck(ClusterRequest.EXECUTE, {
                    ...payload,
                    namespace,
                    name: action,
                });

            console.timeEnd('execute');
            console.timeEnd('delegating');
            console.debug('received', res);
            return {
                ...res,
                responder: randomNode,
            };
        });
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
