import TelegramBot, { SendMessageOptions, KeyboardButton } from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

interface BotConfig {
    token: string;
    options: {
        polling: boolean;
    };
}

const keyboardData1: KeyboardButton = {
    text: "VIP",
}
const keyboardData2: KeyboardButton = {
    text: "Suporte"
}
const keyboardData3: KeyboardButton = {
    text: "Sobre"
}

class TelegramBotApp {
    private bot: TelegramBot;
    private readonly mainKeyboard: SendMessageOptions = {
        reply_markup: {
            keyboard:  [
                [keyboardData1],
                [keyboardData2],
                [keyboardData3]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };

    constructor(config: BotConfig) {
        this.bot = new TelegramBot(config.token, config.options);
        this.initializeHandlers();
    }

    private initializeHandlers(): void {
        // Start command - shows the main keyboard
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            this.bot.sendMessage(
                chatId,
                'Bem-vindo! Por favor, escolha uma das opções abaixo:',
                this.mainKeyboard
            );
        });

        // Handle button responses
        this.bot.on('message', (msg) => {
            const chatId = msg.chat.id;

            switch (msg.text) {
                case 'VIP':
                    this.handleVIP(chatId);
                    break;
                case 'Suporte':
                    this.handleSupport(chatId);
                    break;
                case 'Sobre':
                    this.handleAbout(chatId);
                    break;
            }
        });
    }

    private handleVIP(chatId: number): void {
        this.bot.sendMessage(
            chatId,
            'Área VIP 🌟\n\n' +
            'Benefícios exclusivos para membros VIP:\n' +
            '- Atendimento prioritário\n' +
            '- Conteúdo exclusivo\n' +
            '- Descontos especiais\n\n' +
            'Para se tornar VIP, entre em contato com nosso suporte.'
        );
    }

    private handleSupport(chatId: number): void {
        this.bot.sendMessage(
            chatId,
            'Suporte 💬\n\n' +
            'Como podemos ajudar?\n\n' +
            'Entre em contato através de:\n' +
            '📧 Email: suporte@exemplo.com\n' +
            '📱 WhatsApp: +XX XX XXXX-XXXX\n' +
            '⏰ Horário de atendimento: Seg-Sex, 9h-18h'
        );
    }

    private handleAbout(chatId: number): void {
        this.bot.sendMessage(
            chatId,
            'Sobre Nós ℹ️\n\n' +
            'Somos uma empresa dedicada a fornecer o melhor serviço para nossos clientes.\n\n' +
            '🌐 Website: www.exemplo.com\n' +
            '📍 Localização: São Paulo, SP\n' +
            '📱 Redes Sociais: @exemplo'
        );
    }

    public start(): void {
        console.log('Bot iniciado com sucesso! Pressione Ctrl+C para encerrar.');
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