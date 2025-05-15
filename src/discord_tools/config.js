const fs = require('fs').promises;

class ServerConfig {
    constructor(filePath) {
        this.saveableConfig = {};
        this.filePath = filePath;
        this.loadConfig();
    }

    async loadConfig() {
        try {
            await fs.access(this.filePath);
            const data = await fs.readFile(this.filePath, 'utf-8');
            this.saveableConfig = JSON.parse(data);
        } catch {
            // creates empty file if not exists
            this.saveableConfig = {};
            await fs.writeFile(this.filePath, JSON.stringify(this.saveableConfig, null, 4));
        }
    }

    async saveConfig() {
        try {
            await fs.writeFile(this.filePath, JSON.stringify(this.saveableConfig, null, 4));
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }
}

module.exports = ServerConfig;
