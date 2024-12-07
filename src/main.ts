import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Bot token interface
interface BotConfig {
    token: string;
    options: {
        polling: boolean;
    };
}

// Command handler type
type CommandHandler = (msg: TelegramBot.Message) => void;

class TelegramBotApp {
    private bot: TelegramBot;

    constructor(config: BotConfig) {
        this.bot = new TelegramBot(config.token, config.options);
        this.initializeCommands();
    }

    private initializeCommands(): void {
        // Start command
        this.handleCommand('start', (msg) => {
            const chatId = msg.chat.id;
            this.bot.sendMessage(chatId, 
                `Hello! I'm your TypeScript Telegram bot.
                \nAvailable commands:
                \n/start - Show this welcome message
                \n/time - Get current time
                \n/echo <message> - Echo your message`
            );
        });

        // Time command
        this.handleCommand('time', (msg) => {
            const chatId = msg.chat.id;
            const currentTime = new Date().toLocaleTimeString();
            this.bot.sendMessage(chatId, `Current time is: ${currentTime}`);
        });

        // Echo command
        this.handleCommand('echo', (msg) => {
            const chatId = msg.chat.id;
            const match = msg.text?.match(/\/echo (.+)/);
            
            if (match?.[1]) {
                this.bot.sendMessage(chatId, match[1]);
            } else {
                this.bot.sendMessage(chatId, 'Please provide text to echo after the /echo command');
            }
        });

        // Handle unknown commands
        this.bot.on('message', (msg) => {
            if (msg.text?.startsWith('/')) {
                const chatId = msg.chat.id;
                this.bot.sendMessage(chatId, "I don't understand that command. Use /start to see available commands.");
            }
        });
    }

    private handleCommand(command: string, handler: CommandHandler): void {
        this.bot.onText(new RegExp(`^/${command}`), handler);
    }

    public start(): void {
        console.log('Bot started...');
    }
}

// Configuration
const config: BotConfig = {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    options: {
        polling: true
    }
};

// Start the bot
const bot = new TelegramBotApp(config);
bot.start();
