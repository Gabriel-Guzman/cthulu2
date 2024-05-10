import { APIBasePayload } from '@/discord/commands/payload';
import { ChildNodeResponse } from '@/discord/commands/types';

export enum Questions {
    CAN_EXECUTE = 'can_execute',
    EXECUTE = 'execute',
    REPORT_TO_MOM = 'mom_you_called?',
}

export type APIExecutePayload = {
    name: string;
} & APIBasePayload;

export interface ServerToClientEvents {
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
    [Questions.REPORT_TO_MOM]: (clientId: string) => void;
}

export interface InterServerEvents {}

export interface SocketData {
    clientId: string;
}
