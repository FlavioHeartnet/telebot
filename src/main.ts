import TelegramBot, {  InlineKeyboardMarkup, InlineKeyboardButton } from 'node-telegram-bot-api';
import { config } from './config';
import createPayment from './db/usecases/payment';
import QRCode from 'qrcode';
import UpdatePaymentWithChatId from './db/usecases/update_payment';
import checkPayment from './db/usecases/check_payment';
import getPaymentInfoByTelegramId from './db/usecases/check_payment_user';

interface PaymentData {
    payment_id: number;
    pixCode: string;
    timestamp: Date;
    status: 'pending' | 'completed' | 'failed';
}
interface BotConfig {
    token: string;
    options: {
        polling: boolean;
    };
}
interface UserData {
    email?: string;
    cpf?: string;
    currentField?: 'email' | 'cpf';
    payment_id?: number;
    telegram_id?: number; 
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
    // Store user data temporarily (in production, use a proper database)
    private userDataMap: Map<number, UserData> = new Map();
    private paymentData: Map<number, PaymentData> = new Map();
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

        this.bot.on('message', (msg) => {
            if (msg.text && !msg.text.startsWith('/')) {
                const chatId = msg.chat.id;
                const userData = this.userDataMap.get(chatId);
                
                if (userData?.currentField) {
                    this.handleUserInput(chatId, msg.text, userData);
                }
            }
        });

        // Handle inline keyboard callbacks
        this.bot.on('callback_query', (callbackQuery) => {
            const chatId = callbackQuery.message?.chat.id;
            const messageId = callbackQuery.message?.message_id;
            const userid = callbackQuery.message?.from?.id
            if (!chatId || !messageId) return;

            // Answer the callback query to remove the loading state
            this.bot.answerCallbackQuery(callbackQuery.id);

            switch (callbackQuery.data) {
                case 'pix':
                    this.handlePix(chatId, messageId);
                    break;
                case 'confirm_pix':
                    this.confirmPixPayment(chatId, messageId, userid);
                    break;
                case 'cancel_pix':
                    this.cancelPixPayment(chatId, messageId);
                    break;
                case 'vip':
                    this.handleVIP(chatId, messageId, userid);
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
                case 'verify_payment':
                    this.verifyPayment(chatId, messageId, userid);
                    break;    
            }
        });
    }
    private handleUserInput(chatId: number, text: string, userData: UserData): void {
        if (userData.currentField === 'email') {
            if (this.validateEmail(text)) {
                userData.email = text;
                userData.currentField = 'cpf';
                this.userDataMap.set(chatId, userData);

                const message = 
                    '✅ Email registrado!\n\n' +
                    'Agora, por favor, digite seu CPF (apenas números):';
                
                this.bot.sendMessage(chatId, message, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Cancelar Pagamento ❌', callback_data: 'cancel_pix' }]
                        ]
                    }
                });
            } else {
                this.bot.sendMessage(chatId, '❌ Email inválido. Por favor, tente novamente:');
            }
        } else if (userData.currentField === 'cpf') {
            if (this.validateCPF(text)) {
                userData.cpf = text;
                userData.currentField = undefined;
                this.userDataMap.set(chatId, userData);

                const message = 
                    '✅ Dados confirmados!\n\n' +
                    `Email: ${userData.email}\n` +
                    `CPF: ${this.formatCPF(userData.cpf)}\n\n` +
                    'Deseja confirmar o pagamento?';

                const confirmButtons: { reply_markup: InlineKeyboardMarkup } = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Confirmar Dados ✅', callback_data: 'confirm_pix' }],
                            [{ text: 'Cancelar Pagamento ❌', callback_data: 'cancel_pix' }]
                        ]
                    }
                };

                this.bot.sendMessage(chatId, message, confirmButtons);
            } else {
                this.bot.sendMessage(chatId, '❌ CPF inválido. Por favor, digite apenas números:');
            }
        }
    }
    private async confirmPixPayment(chatId: number, messageId: number, userid: number = 0): Promise<void> {
        const userData = this.userDataMap.get(chatId);
        if (!userData?.email || !userData?.cpf) {
            return this.handlePix(chatId, messageId);
        }
        const paymentInfo = await createPayment({
            buyer_email: userData.email,
            description: "My Product",
            paymentMethodId: "pix",
            transaction_amount: 1,
            identification_type: "cpf",
            identification_number: userData.cpf
        });
        UpdatePaymentWithChatId(userid, paymentInfo.id ?? 0);

        const pixCode = paymentInfo.point_of_interaction?.transaction_data?.qr_code;
        await this.sendpixMessage(pixCode, chatId, messageId);
        // Store payment info for verification
        this.paymentData.set(chatId, {
            pixCode: pixCode ?? "",
            timestamp: new Date(),
            status: 'pending',
            payment_id: paymentInfo.id ?? 0
        });

        // Clear user data
        this.userDataMap.delete(chatId);
    }
    private async sendpixMessage(pixCode: string = "", chatId: number, messageId: number) {
        const qrCodeBuffer = await QRCode.toBuffer(pixCode ?? "", {
            errorCorrectionLevel: 'H',
            margin: 3,
            width: 300,
            type: 'png'
        });

        const message = '✅ Pagamento gerado com sucesso!\n\n' +
            'Escaneie o QR Code acima ou copie o código PIX:\n\n' +
            `\`${pixCode}\``;

        const backButton = this.getRestartButton();
        await this.bot.deleteMessage(chatId, messageId);

        await this.bot.sendPhoto(chatId, qrCodeBuffer, {
            caption: message,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [this.getcheckPaymentButton(), backButton] }
        });
        return pixCode;
    }

    private cancelPixPayment(chatId: number, messageId: number): void {
        // Clear user data
        this.userDataMap.delete(chatId);

        const message = '❌ Pagamento cancelado. Voltando ao menu principal...';
        
        this.bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: this.mainKeyboard.reply_markup
        });
        this.paymentData.set(chatId, {
            pixCode: "",
            timestamp: new Date(),
            status: 'failed',
            payment_id: 0
        });
    }

    private async verifyPayment(chatId: number, messageId: number, userid: number = 0): Promise<void> {
        
        
       const info = await getPaymentInfoByTelegramId(userid);
       if (!info) {
        await this.bot.editMessageCaption(
            '❌ Desculpe, não foi possível encontrar os dados do pagamento. Por favor, tente novamente.',
            {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Voltar ao Menu Principal ↩️', callback_data: 'back' }]
                    ]
                }
            }
        );
            return;
        }
        // Here you would integrate with your PIX payment verification system
        try {
            // Mock verification response (replace with actual API call)
            const paymentStatus = 'approved'; //await checkPayment(info.id);
    
            if (paymentStatus == 'approved') {
                const inviteLink = await this.bot.createChatInviteLink(
                    -4774094168, // Replace with your actual group ID or username
                    {
                        name: `VIP Member - ${new Date().toISOString()}`,
                        expire_date: undefined, // Never expires
                        member_limit: 1, // One-time use
                        creates_join_request: false
                    }
                );
                await this.bot.sendMessage(chatId, 
                    '✅ Pagamento aprovado com sucesso!\n\n' +
                    '🎉 Seu acesso VIP já está liberado.\n' +
                    '🌟 Bem-vindo ao NobleSpace VIP!\n\n' +
                    '📱 Clique no botão abaixo para entrar no grupo exclusivo.\n',
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔓 Entrar no Grupo VIP', url: inviteLink.invite_link }],
                                [{ text: 'Voltar ao Menu Principal ↩️', callback_data: 'back' }]
                            ]
                        }
                    }
                );
            } else {
                await this.bot.editMessageCaption(
                    '⏳ Pagamento ainda não confirmado.\n\n' +
                    'Por favor, verifique se:\n' +
                    '• O pagamento foi realizado corretamente\n' +
                    '• Aguarde alguns instantes e tente novamente\n\n' +
                    '📝 Se o problema persistir, entre em contato com o suporte.',
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '✅ Verificar Novamente', callback_data: 'verify_payment' }],
                                [{ text: 'Voltar ao Menu Principal ↩️', callback_data: 'back' }]
                            ]
                        }
                    }
                );
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            await this.bot.editMessageCaption(
                '❌ Erro ao verificar o pagamento. Por favor, tente novamente em instantes.',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ Tentar Novamente', callback_data: 'verify_payment' }],
                            [{ text: 'Voltar ao Menu Principal ↩️', callback_data: 'back' }]
                        ]
                    }
                }
            );
        }
    }

    private handlePix(chatId: number, messageId: number): void {
        // Initialize user data collection
        this.userDataMap.set(chatId, { currentField: 'email' });

        const message = 
            '💰 Pagamento via PIX\n\n' +
            'Por favor, digite seu email:';

        const cancelButton: { reply_markup: InlineKeyboardMarkup } = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Cancelar Pagamento ❌', callback_data: 'cancel_pix' }]
                ]
            }
        };

        this.bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: cancelButton.reply_markup
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
        return [{ text: 'Voltar ao Menu Principal ↩️', callback_data: 'back' }]
    }
    private getPixButton() {
        return [{ text: 'Pagamento em Pix ↩️', callback_data: 'pix' }]
    }
    private getRestartButton() {
        return [{ text: 'Voltar ao Menu Principal ↩️', callback_data: 'restart' }]
    }
    private getcheckPaymentButton() {
        return [{ text: '✅ Verificar Pagamento', callback_data: 'verify_payment' }]
    }            
    // Validation helpers
    private validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private validateCPF(cpf: string): boolean {
        const cpfClean = cpf.replace(/\D/g, '');
        return cpfClean.length === 11 && /^\d{11}$/.test(cpfClean);
    }

    private formatCPF(cpf: string): string {
        const cpfClean = cpf.replace(/\D/g, '');
        return cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    private async handleVIP(chatId: number, messageId: number, userid:number = 0) {
        const info = await getPaymentInfoByTelegramId(userid);
        if(!info){
            this.bot.editMessageText(
                'Área VIP 🌟\n\n' +
                'Benefícios exclusivos para membros VIP:\n' +
                '• Atendimento prioritário\n' +
                '• Conteúdo exclusivo\n' +
                '• Descontos especiais\n\n' +
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {inline_keyboard: [this.getPixButton(), this.getBackButton()]},
                }
            );
        }else{
            const payment_status = info.status;
            if(payment_status == 'pending'){
                const pixCode = info.point_of_interaction?.transaction_data?.qr_code;
                //store data for payment to be used in other commands locally
                this.paymentData.set(chatId, {
                    pixCode: pixCode ?? "",
                    timestamp: new Date(),
                    status: 'pending',
                    payment_id: info.id ?? 0
                });
                await this.sendpixMessage(pixCode, chatId, messageId);
            }else{
                this.verifyPayment(chatId, messageId);
            }
        }
        
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

