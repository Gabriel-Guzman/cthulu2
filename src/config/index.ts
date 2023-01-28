type RecursiveReadOnly<T> = T extends Object
    ? {
          readonly [Property in keyof T]: RecursiveReadOnly<T[Property]>;
      }
    : {
          readonly [Property in keyof T]: T[Property];
      };

interface BaseConfig {
    levels: {
        xpGain: {
            events: {
                messageCreate: number;
            };
        };
    };
    http: {
        port: number;
    };
    delegation: {
        role: string | undefined;
    };
}

type Config = RecursiveReadOnly<BaseConfig>;

const config: Config = {
    levels: {
        xpGain: {
            events: {
                messageCreate: 5,
            },
        },
    },
    http: {
        port: +process.env.PORT,
    },
    delegation: {
        role: process.env.DELEGATION_ROLE,
    },
};

export default config;
