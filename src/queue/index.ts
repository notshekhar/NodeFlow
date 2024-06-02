import { QueryTypes, Sequelize, Transaction } from "sequelize"
import { TASK_STATUS } from "../types/queue.type"

interface TaskOptions {
    delay: number // in milliseconds
    attempts: number
    // repeat: number
    backoff: number
    removeOnComplete: boolean
    removeOnFail: boolean
    // priority: number
    stalledInterval: number
}

interface Task {
    id: number
    data: string
    response: string
    status: string
    attempts: number
    option_attempts: number
    delay: number
    backoff: number
    removeOnComplete: boolean
    removeOnFail: boolean
    stalledInterval: number
    lastAttempt: Date
    created: Date
    updated: Date
}
export class QueueSqlite<T> {
    db: Sequelize
    name: string
    options: TaskOptions
    limiter: {
        max: number
        duration: number
    }

    constructor({
        connection,
        name,
        limiter,
        defaultTaskOptions,
    }: {
        connection: Sequelize
        name: string
        limiter?: {
            max: number
            duration: number
        }
        defaultTaskOptions?: TaskOptions
    }) {
        this.db = connection
        this.name = name
        this.limiter = limiter || {
            max: 1,
            duration: 1000,
        }
        this.options = defaultTaskOptions || {
            delay: 1,
            attempts: 3,
            backoff: 1000,
            removeOnComplete: true,
            removeOnFail: false,
            stalledInterval: 30000,
        }
    }
    async initialize() {
        try {
            await this.db.query(
                `CREATE TABLE IF NOT EXISTS queue_${this.name} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data JSON,
                    response TEXT,
                    status TEXT,
                    option_attempts INTEGER,
                    attempts INTEGER DEFAULT 0,
                    delay INTEGER,
                    backoff INTEGER,
                    removeOnComplete BOOLEAN,
                    removeOnFail BOOLEAN,
                    stalledInterval INTEGER,
                    lastAttempt TIMESTAMP DEFAULT null,
                    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`,
                { type: QueryTypes.RAW }
            )
            await this.db.query(
                `CREATE INDEX IF NOT EXISTS queue_${this.name}_status_index ON queue_${this.name} (status)`,
                { type: QueryTypes.RAW }
            )
            await this.db.query(
                `CREATE TRIGGER IF NOT EXISTS queue_${this.name}_update_timestamp
                AFTER UPDATE ON queue_${this.name}
                BEGIN
                    UPDATE queue_${this.name} SET updated = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;`,
                { type: QueryTypes.RAW }
            )
            return true
        } catch (error) {
            console.log("Error in init", error)
            return false
        }
    }
    async add(data: T, options?: TaskOptions) {
        try {
            const addTask = await this.db.query(
                `
                    INSERT INTO queue_${this.name} 
                    (data, status, attempts, delay, backoff, removeOnComplete, removeOnFail, stalledInterval) 
                    VALUES (:data, :status, :attempts, :delay, :backoff, :removeOnComplete, :removeOnFail, :stalledInterval)
                `,
                {
                    replacements: {
                        data: JSON.stringify(data),
                        status: TASK_STATUS.ACTIVE,
                        attempts: options?.attempts || this.options.attempts,
                        delay: options?.delay || this.options.delay,
                        backoff: options?.backoff || this.options.backoff,
                        removeOnComplete:
                            options?.removeOnComplete ||
                            this.options.removeOnComplete,
                        removeOnFail:
                            options?.removeOnFail || this.options.removeOnFail,
                        stalledInterval:
                            options?.stalledInterval ||
                            this.options.stalledInterval,
                    },
                    type: QueryTypes.INSERT,
                }
            )
            if (addTask[1] === 1) {
                return {
                    taskId: addTask[0],
                }
            }
            return null
        } catch (error) {
            console.log("Error in add", error)
            return null
        }
    }
    async get(taskId: number) {
        try {
            const tasks = (await this.db.query(
                `
                    SELECT * FROM queue_${this.name} WHERE id = :id
                `,
                {
                    replacements: { id: taskId },
                    type: QueryTypes.SELECT,
                }
            )) as {
                id: number
                data: string
                response: string
                status: string
                attempts: number
                delay: number
                backoff: number
                removeOnComplete: boolean
                removeOnFail: boolean
                stalledInterval: number
                created: Date
                updated: Date
            }[]
            if (tasks.length === 0) {
                return null
            }
            return tasks[0]
        } catch (error) {
            console.log("Error in get", error)
            return null
        }
    }
    private async _getActiveTasks(limit: number, transaction?: Transaction) {
        const tasks = (await this.db.query(
            `
                    SELECT * FROM queue_${this.name}
                    WHERE (
                        status = :activeStatus
                        AND (delay + UNIX_TIMESTAMP(now())) <= UNIX_TIMESTAMP(now())
                    ) OR (
                        status = :failedStatus
                        AND (backoff + UNIX_TIMESTAMP(now())) <= UNIX_TIMESTAMP(now())
                        AND attempts < option_attempts
                        AND (backoff + UNIX_TIMESTAMP(now())) <= UNIX_TIMESTAMP(lastAttempt)
                    )
                    ORDER BY created ASC
                    LIMIT :limit
                `,
            {
                replacements: {
                    activeStatus: TASK_STATUS.ACTIVE,
                    failedStatus: TASK_STATUS.FAILED,
                    limit,
                },
                type: QueryTypes.SELECT,
                transaction,
            }
        )) as Task[]
        return tasks
    }
    private async _updateTasksPending(
        ids: number[],
        status: string,
        transaction?: Transaction
    ) {
        await this.db.query(
            `
                UPDATE queue_${this.name}
                SET status = :status
                WHERE id IN (:taskIds)
            `,
            {
                replacements: {
                    status,
                    taskIds: ids,
                },
                type: QueryTypes.UPDATE,
                transaction,
            }
        )
    }
    async process(handler: Function, concurrency: number = this.limiter.max) {
        while (this.limiter.max) {
            const transaction = await this.db.transaction()
            try {
                const tasks = await this._getActiveTasks(
                    concurrency,
                    transaction
                )
                if (tasks.length === 0) {
                    await transaction.commit()
                    this._delay(1000)
                }
                // Update their status to pending
                await this._updateTaskStatus(
                    taskIds,
                    TASK_STATUS.PENDING,
                    transaction
                )
                await transaction.commit()
                for (let i = 0; i < concurrency; i++) {}
            } catch (error) {
                console.log("Error in process", error)
                await transaction.rollback()
            }
            this._delay(10)
        }
    }
    private async _delay(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms)
        })
    }
}
