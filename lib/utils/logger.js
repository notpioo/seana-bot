class Logger {
    info(message) {
        console.log(`[INFO] ${message}`)
    }

    error(message) {
        console.log(`[ERROR] ${message}`)
    }

    warn(message) {
        console.log(`[WARN] ${message}`)
    }
}

module.exports = new Logger()