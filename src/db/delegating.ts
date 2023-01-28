import mongoose from "mongoose";

export type DelegationRole = "DELEGATOR" | "DELEGATE";

export interface IInstanceInfo {
    port: number;
    role: DelegationRole;
    clientUserId: string;
    active: boolean;
}
const InstanceInfoSchema = new mongoose.Schema<IInstanceInfo>({
    clientUserId: {
        type: String,
        required: true,
    },
    port: {
        type: Number,
        required: true,
    },
    role: {
        type: String,
        enum: ["DELEGATOR", "DELEGATE"],
        required: true,
    },
    active: {
        type: Boolean,
        required: true,
        default: true,
    },
});

const InstanceInfo = mongoose.model("InstanceInfo", InstanceInfoSchema);

export { InstanceInfo };
