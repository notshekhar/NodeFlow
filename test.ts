// // const NodeFlow = require("nodeflow")

// // // by default it will use sqlite3 and store everything there
// // // this will create connection to all the connections which are kept in connection pool
// // const flow = NodeFlow({
// //     storage: {
// //         type: "sqlite3", // mysql, postgres, sqlite3
// //         path: "./nodeflow.sqlite3",
// //     },
// // })

// // const workflow = NodeFlow.Workflow({
// //     description: "This is a workflow",
// //     schedule: "0 0 * * * *",
// //     retries: 3,
// //     startDate: Date.now(),
// // })
// // const task = NodeFlow.Task({
// //     description: "This is a task",
// //     handler: async (task) => {
// //         console.log(Variable.get("test"))
// //     },
// // })
// // const task2 = NodeFlow.Task({
// //     description: "This is a task",
// //     handler: async (task) => {},
// // })
// // workflow.add(task)
// // workflow.add(task2)

// // task2.dependent(task)

// // flow.add(workflow)

// // flow.listen(3000, () => {})

// import { QueryTypes } from "sequelize"
// import { NodeFlow } from "./src/index"

// const flow = NodeFlow({
//     storage: {
//         type: "sqlite3",
//         path: "./nodeflow.sqlite",
//     },
// })
// async function a() {
//     while (true) {
//         console.log("Hello")
//         await c()
//     }
// }
// async function b() {
//     while (true) {
//         console.log("Hello1")
//         await c()
//     }
// }
// async function d() {
//     while (true) {
//         console.log("Hello2")
//         await c()
//     }
// }
// function c() {
//     return new Promise((resolve, reject) => {
//         setTimeout(() => {
//             resolve(1)
//         }, 1)
//     })
// }

// function e() {
//     console.log("4")
// }

// a()
// b()
// d()
// async function init() {
//     for (let i = 0; i < 10000; i++) {
//         e()
//         await c()
//     }
// }
// init()

import { db } from "./src/constants/test-db.constant"
import { QueueSqlite } from "./src/queue/index"

const queue = new QueueSqlite({ name: "test", connection: db })

async function init() {
    await queue.initialize()
    console.log("Queue initialized")
    const task = await queue.add({ data: { test: "test" } })
    console.log("Task added", task)
}

init()
