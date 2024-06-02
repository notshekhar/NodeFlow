declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: "development" | "staging" | "production"
            DB_HOST: string
            DB_PORT: string
            DB_USER: string
            DB_PASSWORD: string
            DB_NAME: string
            DOMAIN: string
            JWT_SECRET: string
            REDIS_HOST: string
            REDIS_PORT: string
            REDIS_PASSWORD: string
        }
    }
}

export {}
