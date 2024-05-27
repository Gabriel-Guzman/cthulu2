import { io, Socket } from 'socket.io-client';
import {
    ClientToServerEvents,
    ClusterableCommandResponse,
    ClusterRequest,
    ServerToClientEvents,
} from '@/cluster/types';
import { IExtendedClient } from '@/discord/client';

export class ClusterChildIO {
    socket: Socket<ServerToClientEvents, ClientToServerEvents>;

    constructor(socket) {
        this.socket = socket;
    }

    reportForDuty(client: IExtendedClient) {
        this.socket.emit(ClusterRequest.REPORT_TO_MOM, client.user.id);
    }
}

export async function buildChildIO(): Promise<ClusterChildIO> {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
        'http://localhost:3000',
    );
    await new Promise<void>((resolve) => {
        socket.on('connect', () => {
            resolve();
        });
        socket.on('connect_error', (err) => {
            console.error('socketio connection error', err.name);
        });
    });
    return new ClusterChildIO(socket);
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
