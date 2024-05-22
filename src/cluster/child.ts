import { io, Socket } from 'socket.io-client';
import { ClusterableCommandResponse } from '@/discord/commands/types';
import {
    ClientToServerEvents,
    ClusterRequest,
    ServerToClientEvents,
} from '@/cluster/types';
import { IExtendedClient } from '@/discord/client';

export class ChildSocketManager {
    socket: Socket<ServerToClientEvents, ClientToServerEvents>;

    constructor(socket) {
        this.socket = socket;
    }

    reportForDuty(client: IExtendedClient) {
        this.socket.emit(ClusterRequest.REPORT_TO_MOM, client.user.id);
    }
}

export async function buildChildClient(): Promise<ChildSocketManager> {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
        'http://localhost:3000',
    );
    await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => {
            resolve();
        });
        socket.on('connect_error', (err) => {
            reject(err);
        });
    });
    return new ChildSocketManager(socket);
}

export function buildChildNodeResponse(
    success: boolean,
    message: string,
): ClusterableCommandResponse {
    return {
        success,
        message,
    };
}
