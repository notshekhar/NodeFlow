import crypto from "node:crypto"

export default function useLogger(tag?: string) {
    const uuid = crypto.randomUUID()
    function log(...args: any[]) {
        try {
            console.log(`[${tag || uuid}]`, ...args)
        } catch (error) {
            console.log("Error in log", error)
        }
    }
    return log
}
