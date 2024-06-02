import { Sequelize } from "sequelize"
import express from "express"

import { SqliteOptions } from "./types/index.type"

export function NodeFlow({ storage }: { storage: SqliteOptions }) {
    return new n({ storage })
}

class n {
    storage: SqliteOptions
    db: Sequelize
    app: express.Express

    constructor({ storage }: { storage: SqliteOptions }) {
        this.storage = storage
        this.db = this.init()
        this.app = this.server()
    }
    server() {
        return express()
    }
    init() {
        // SQLite connection
        return new Sequelize({
            dialect: "sqlite",
            storage: this.storage.path,
        })
    }

    start() {
        console.log("Starting server")
        this.app.listen(3000, () => {
            console.log("Database connected")
            console.log("Server started on port 3000")
            console.log("Ready to accept requests")
            console.log("Open http://localhost:3000 in your browser")
        })
    }
}
