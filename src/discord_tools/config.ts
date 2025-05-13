import { promises as fs } from 'fs';


class ServerConfig {
    private saveableConfig: Record<string, string | number> = {};
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath
        this.loadConfig();
    }

    private async loadConfig(): Promise<void> {
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

    public async saveConfig(): Promise<void> {
        try {
            await fs.writeFile(this.filePath, JSON.stringify(this.saveableConfig, null, 4));
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }

}


