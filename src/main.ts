import TelegramBot, { SendMessageOptions, InlineKeyboardMarkup, InlineKeyboardButton } from 'node-telegram-bot-api';
import { config } from './config';


interface BotConfig {
    token: string;
    options: {
        polling: boolean;
    };
}

const keyboardData1: InlineKeyboardButton = {
    text: 'VIP 🌟', callback_data: 'vip'
}
const keyboardData2: InlineKeyboardButton = {
    text: 'Suporte 💬', callback_data: 'support'
}
const keyboardData3: InlineKeyboardButton = {
     text: 'Sobre ℹ️', callback_data: 'about' 
}

class TelegramBotApp {
    private bot: TelegramBot;
    private readonly mainKeyboard: { reply_markup: InlineKeyboardMarkup } = {
        reply_markup: {
            inline_keyboard:  [
                [keyboardData1],
                [keyboardData2],
                [keyboardData3]
            ],
        },
    };

    constructor(config: BotConfig) {
        this.bot = new TelegramBot(config.token, config.options);
        this.initializeHandlers();
    }

    private initializeHandlers(): void {
        // Start command - shows the main menu
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            this.sendMainMenu(chatId);
        });

        this.bot.onText(/\/restart/, (msg) => {
            const chatId = msg.chat.id;
            this.handleRestart(chatId);
        });

        // Handle inline keyboard callbacks
        this.bot.on('callback_query', (callbackQuery) => {
            const chatId = callbackQuery.message?.chat.id;
            const messageId = callbackQuery.message?.message_id;

            if (!chatId || !messageId) return;

            // Answer the callback query to remove the loading state
            this.bot.answerCallbackQuery(callbackQuery.id);

            switch (callbackQuery.data) {
                case 'vip':
                    this.handleVIP(chatId, messageId);
                    break;
                case 'support':
                    this.handleSupport(chatId, messageId);
                    break;
                case 'about':
                    this.handleAbout(chatId, messageId);
                    break;
                case 'back':
                    this.sendMainMenu(chatId, messageId);
                    break;
                case 'restart':
                    this.handleRestart(chatId);
                    break;
            }
        });
    }

    private handleRestart(chatId: number): void {
        const restartMessage = 
            '🔄 Bot reiniciado!\n\n' +
            'Comandos disponíveis:\n' +
            '/start - Iniciar conversa\n' +
            '/restart - Reiniciar conversa\n\n' +
            'Escolha uma opção abaixo:';

        // Delete previous messages (optional)
        this.bot.deleteMessage(chatId, chatId)
            .catch(() => {}); // Ignore errors if message doesn't exist

        // Send new welcome message with main menu
        this.bot.sendMessage(chatId, restartMessage, this.mainKeyboard);
    }

    private sendMainMenu(chatId: number, messageId?: number): void {
        const text = 'Bem-vindo! Por favor, escolha uma das opções abaixo:';
        
        if (messageId) {
            this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                ...this.mainKeyboard,

            });
        } else {
            this.bot.sendMessage(chatId, text, this.mainKeyboard);
        }
    }

    private getBackButton() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Voltar ao Menu Principal ↩️', callback_data: 'back' }]
                ]
            }
        };
    }
    private handleVIP(chatId: number, messageId: number): void {
        this.bot.editMessageText(
            'Área VIP 🌟\n\n' +
            'Benefícios exclusivos para membros VIP:\n' +
            '• Atendimento prioritário\n' +
            '• Conteúdo exclusivo\n' +
            '• Descontos especiais\n\n' +
            'Para se tornar VIP, entre em contato com nosso suporte.',
            {
                chat_id: chatId,
                message_id: messageId,
                ...this.getBackButton()
            }
        );
    }

    private handleSupport(chatId: number, messageId: number): void {
        this.bot.editMessageText(
            'Suporte 💬\n\n' +
            'Como podemos ajudar?\n\n' +
            'Entre em contato através de:\n' +
            '📧 Email: suporte@exemplo.com\n' +
            '📱 WhatsApp: +XX XX XXXX-XXXX\n' +
            '⏰ Horário de atendimento: Seg-Sex, 9h-18h',
            {
                chat_id: chatId,
                message_id: messageId,
                ...this.getBackButton()
            }
        );
    }

    private handleAbout(chatId: number, messageId: number): void {
        this.bot.editMessageText(
            'Sobre Nós ℹ️\n\n' +
            'Somos uma empresa dedicada a fornecer o melhor serviço para nossos clientes.\n\n' +
            '🌐 Website: www.exemplo.com\n' +
            '📍 Localização: São Paulo, SP\n' +
            '📱 Redes Sociais: @exemplo',
            {
                chat_id: chatId,
                message_id: messageId,
                ...this.getBackButton()
            }
        );
    }

    public start(): void {
        console.log('Bot iniciado com sucesso! Pressione Ctrl+C para encerrar.');
    }
}

// Configuration
const configuration: BotConfig = {
    token: config.telegramBotKey || '',
    options: {
        polling: true
    }
};

// Start the bot
const bot = new TelegramBotApp(configuration);
bot.start();