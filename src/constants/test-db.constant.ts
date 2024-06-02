import { Sequelize } from "sequelize"

export const db = new Sequelize({
    dialect: "sqlite",
    storage: "test-database.sqlite",
    logging: process.env.NODE_ENV === "development" ? true : false,
})
