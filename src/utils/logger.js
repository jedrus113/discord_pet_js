const fs = require('fs');
const path = require('path');


const logDir = `data_servers/general/logs`
fs.mkdirSync(logDir, { recursive: true });

function log(message) {
    const logFile = path.join(logDir, `log_${new Date().toISOString().slice(0,10)}.txt`);
    const timestamp = new Date().toISOString();
    const fullMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, fullMessage, 'utf8');
    console.log(fullMessage);
}

module.exports = { log };