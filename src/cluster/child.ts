import { io, Socket } from 'socket.io-client';
import { ChildNodeResponse } from '@/discord/commands/types';
import {
    ClientToServerEvents,
    Questions,
    ServerToClientEvents,
} from '@/cluster/types';
import { IExtendedClient } from '@/discord/client';

export type DeployedSocketCommuncation = {
    heartbeatTimer: NodeJS.Timer;
    socket: Socket;
};

export class ChildSocketManager {
    socket: Socket<ServerToClientEvents, ClientToServerEvents>;

    constructor(socket) {
        this.socket = socket;
    }

    reportForDuty(client: IExtendedClient) {
        this.socket.emit(Questions.REGISTER, client.user.id);
    }
}

export async function buildChildClient(): Promise<ChildSocketManager> {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();
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
): ChildNodeResponse {
    return {
        success,
        message,
    };
}
