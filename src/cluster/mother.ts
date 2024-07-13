import { Server } from 'socket.io';
import { createServer } from 'http';
import {
    ClientToServerEvents,
    ClusterableEventHandlerResponse,
    ClusterRequest,
    InterServerEvents,
    ServerToClientEvents,
    SocketData,
} from '@/cluster/types';
import {
    CommandBaseMinimumPayload,
    VoiceStateBaseMinimumPayload,
} from '@/discord/commands/payload';
import { Context } from '@/discord';
import config from '@/config';
import Checkout from '@/helpers/checkout';

type DelegationResponse = {
    responder?: string;
} & ClusterableEventHandlerResponse;

// contains all the logic for delegating events to connected child instances.
export class ClusterMotherIO {
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

    // delegate an event to a random child.
    // namespace: an identifier for the type of event.
    // action: the name of the handler to call.
    // payload: the payload to pass to the handler. must be able to be JSON serialized.
    // checkoutLane: the key of the lane used for this delegation. delegations in
    //  the same lane will run as FIFO, but different lanes run in parallel.
    async delegate(
        ctx: Context,
        namespace: string,
        action: string,
        payload: CommandBaseMinimumPayload | VoiceStateBaseMinimumPayload,
        checkoutLane = 'global',
    ): Promise<DelegationResponse> {
        // queue up the delegation request into the specified lane.
        return this.checkout.placeOrder(checkoutLane, async () => {
            const delegationTimerLabel = `[ClusterMotherIO.delegate] ${namespace}.${action}`;
            const canExecuteTimerLabel = `[ClusterMotherIO.delegate] can_execute ${namespace}.${action}`;
            console.time(delegationTimerLabel);
            console.time(canExecuteTimerLabel);
            const responses = await this.io
                .timeout(config.clustering.childMessageTimeout)
                .emitWithAck(ClusterRequest.CAN_EXECUTE, {
                    ...payload,
                    namespace,
                    name: action,
                });

            console.timeEnd(canExecuteTimerLabel);

            const yesIds = responses.filter((response) => response.length);
            if (!yesIds.length) {
                console.timeEnd(delegationTimerLabel);
                return {
                    success: false,
                    message: 'no childs could execute. add more bots!',
                };
            }

            const randomNode =
                yesIds[Math.floor(Math.random() * yesIds.length)];

            const executeTimerLabel = `[ClusterMotherIO.delegate] execute ${namespace}.${action}`;
            console.time(executeTimerLabel);
            console.debug('requesting execute from ', randomNode);
            const [res] = await this.io
                .to(randomNode)
                .timeout(config.clustering.childMessageTimeout)
                .emitWithAck(ClusterRequest.EXECUTE, {
                    ...payload,
                    namespace,
                    name: action,
                });

            console.timeEnd(executeTimerLabel);
            console.timeEnd(delegationTimerLabel);
            console.debug('received', res);
            return {
                ...res,
                responder: randomNode,
            };
        });
    }
}

export function createMotherIO(): ClusterMotherIO {
    const httpServer = createServer();
    const io = new Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >(httpServer);

    httpServer.listen(3000);
    return new ClusterMotherIO(io);
}
