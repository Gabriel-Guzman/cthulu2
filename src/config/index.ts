export enum ClusteringRole {
    CHILD = 'CHILD',
    MOTHER = 'MOTHER',
}

export default {
    levels: {
        xpGain: {
            events: {
                messageCreate: 5,
            },
        },
    },
    clustering: {
        role: process.env.ROLE as ClusteringRole,
        childMessageTimeout: 5000, // ms
    },
};
