import {
    CommandBaseMinimumPayload,
    VoiceStateBaseMinimumPayload,
} from '@/discord/commands/payload';
import { ClusterableCommandResponse } from '@/discord/commands/types';
import { Context } from '@/discord';
import { BaseEventHandler } from '@/discord/eventHandlers/types';

export enum ClusterRequest {
    CAN_EXECUTE = 'can_execute',
    EXECUTE = 'execute',
    REPORT_TO_MOM = 'mom_you_called?',
}

export enum ClusterRequestNamespace {
    COMMAND = 'command',
    VOICE_STATE_UPDATE = 'voiceStateUpdate',
}

export type APIExecutePayload = {
    namespace: string;
    name: string;
} & (CommandBaseMinimumPayload | VoiceStateBaseMinimumPayload);

export interface ServerToClientEvents {
    [ClusterRequest.CAN_EXECUTE]: (
        payload: APIExecutePayload,
        cb: (clientId: string) => void | Promise<void>,
    ) => void | Promise<void>;
    [ClusterRequest.EXECUTE]: (
        payload: APIExecutePayload,
        cb: (response: ClusterableCommandResponse) => void | Promise<void>,
    ) => void | Promise<void>;
}

export interface ClientToServerEvents {
    [ClusterRequest.REPORT_TO_MOM]: (clientId: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InterServerEvents {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SocketData {}

export interface ClusterableEventHandler<
    // the native discord event data received with this event.
    EventData,
    // system context. database, cache, clustering client, etc
    CTX extends Context = Context,
    // the minimum possible payload required to run this event handler.
    // this structure is what is expected from a mother delegation.
    Payload = CommandBaseMinimumPayload | VoiceStateBaseMinimumPayload,
    ExecuteResponse = void,
> extends BaseEventHandler {
    // return true if the event fulfills the conditions for this handler to run.
    validate(ctx: CTX, evData: EventData): Promise<boolean>;

    buildPayload(ctx: CTX, evData: EventData): Promise<Payload>;

    // return true if this bot instance fulfills the conditions to run the event
    // handler. returning false means the event could still be handled on another
    // instance.
    canExecute(ctx: CTX, evData: Payload): Promise<boolean>;

    // core handler execution. can assume that payload is already validated by leader.
    execute(ctx: CTX, payload: Payload): Promise<ExecuteResponse>;
}
