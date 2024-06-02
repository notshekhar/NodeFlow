export interface SqliteOptions {
    type: "sqlite3"
    path: string
}
export interface MysqlOptions {
    type: "mysql"
    host: string
    port: number
    user: string
    password: string
    database: string
}
