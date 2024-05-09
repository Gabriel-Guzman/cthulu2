import { APIBasePayload } from '@/discord/commands/payload';
import { ChildNodeResponse } from '@/discord/commands/types';

export enum Questions {
    HEARTBEAT = 'heartbeat',
    CAN_EXECUTE = 'can_execute',
    EXECUTE = 'execute',
    REGISTER = 'register',
}

export type APIExecutePayload = {
    name: string;
} & APIBasePayload;

export interface ServerToClientEvents {
    // [Questions.CAN_EXECUTE]: (payload: APIBasePayload) => string | false;
    [Questions.CAN_EXECUTE]: (
        payload: APIExecutePayload,
        cb: (clientId: string) => void | Promise<void>,
    ) => void | Promise<void>;
    [Questions.EXECUTE]: (
        payload: APIExecutePayload,
        cb: (response: ChildNodeResponse) => void | Promise<void>,
    ) => void | Promise<void>;
}

export interface ClientToServerEvents {
    [Questions.REGISTER]: (clientId: string) => void;
}

export interface InterServerEvents {}

export interface SocketData {
    clientId: string;
}
