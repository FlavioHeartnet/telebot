import TelegramBot, {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
} from "node-telegram-bot-api";
import createPayment from "./payment/payment";
import QRCode from "qrcode";
import UpdatePaymentWithChatId from "./payment/update_payment";
import getPaymentInfoByTelegramId from "./payment/check_payment_user";
import activatePlan from "./db/usecases/activate_plan";
import isExpired from "./db/usecases/verify_expired";
import { createInvite } from "./botActions/createInvite";

interface PaymentData {
  payment_id: number;
  pixCode: string;
  timestamp: Date;
  status: "pending" | "completed" | "failed";
}
export interface BotConfig {
  token: string;
  id: number;
  groupId?: string;
  options: {
    polling: boolean;
  };
}
interface UserData {
  email?: string;
  currentField?: "email" | "cpf";
  payment_id?: number;
  telegram_id?: number;
  botId?: number;
}
const keyboardData1: InlineKeyboardButton = {
  text: "VIP 🌟",
  callback_data: "vip",
};
const keyboardData2: InlineKeyboardButton = {
  text: "Suporte 💬",
  callback_data: "support",
};
interface BotInstance {
  bot: TelegramBot;
  bot_id:number;
  groupId?: string;
}
export class TelegramBotApp {
  private userDataMap: Map<number, UserData> = new Map();
  private paymentData: Map<number, PaymentData> = new Map();
  private bots: Map<string, BotInstance> = new Map();
  private readonly mainKeyboard: { reply_markup: InlineKeyboardMarkup } = {
    reply_markup: {
      inline_keyboard: [
        [keyboardData1],
        [keyboardData2],
      ],
    },
  };

  constructor() {}

  public initializeBot(config: BotConfig){
    const bot = new TelegramBot(config.token, config.options);
    const instance = {
      bot: bot,
      bot_id: config.id,
      groupId: config.groupId
    }
    this.bots.set(config.token, instance);
    this.initializeHandlers(instance);
  }

  private initializeHandlers(instance: BotInstance): void {
    const { bot, bot_id } = instance;
    // Start command - shows the main menu
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.sendMainMenu(chatId, bot);
    });

    bot.onText(/\/restart/, (msg) => {
      const chatId = msg.chat.id;
      this.handleRestart(chatId, bot);
    });

    bot.on("message", (msg) => {
      if (msg.text && !msg.text.startsWith("/")) {
        const chatId = msg.chat.id;
        const userData = this.userDataMap.get(chatId);

        if (userData?.currentField) {
          this.handleUserInput(chatId, msg.text, userData, bot);
        }
      }
    });

    // Handle inline keyboard callbacks
    bot.on("callback_query", (callbackQuery) => {
      const chatId = callbackQuery.message?.chat.id;
      const messageId = callbackQuery.message?.message_id;
      const userid = callbackQuery.message?.from?.id;
      if (!chatId || !messageId) return;

      // Answer the callback query to remove the loading state
      bot.answerCallbackQuery(callbackQuery.id);

      switch (callbackQuery.data) {
        case "pix":
          this.handlePix(chatId, messageId, bot);
          break;
        case "confirm_pix":
          this.confirmPixPayment(chatId, messageId, userid, bot, bot_id);
          break;
        case "cancel_pix":
          this.cancelPixPayment(chatId, messageId, bot);
          break;
        case "vip":
          this.handleVIP(chatId, messageId, userid, bot, bot_id);
          break;
        case "support":
          this.handleSupport(chatId, messageId, bot);
          break;
        case "about":
          this.handleAbout(chatId, messageId, bot);
          break;
        case "back":
          this.sendMainMenu(chatId, bot, messageId);
          break;
        case "restart":
          this.handleRestart(chatId, bot);
          break;
        case "verify_payment":
          this.verifyPayment(chatId, messageId, userid, bot, bot_id);
          break;
      }
    });
  }
  private handleUserInput(
    chatId: number,
    text: string,
    userData: UserData,
    bot: TelegramBot
  ): void {
    if (this.validateEmail(text)) {
      userData.currentField = "email";
      userData.email = text;
      this.userDataMap.set(chatId, userData);

      const message = "✅ Dados confirmados!\n\n" +
        `Email: ${text}\n` +
        "Deseja confirmar o pagamento?";

      const confirmButtons: { reply_markup: InlineKeyboardMarkup } = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Confirmar Dados ✅", callback_data: "confirm_pix" }],
            [{ text: "Cancelar Pagamento ❌", callback_data: "cancel_pix" }],
          ],
        },
      };

      bot.sendMessage(chatId, message, confirmButtons);
    } else {
      bot.sendMessage(
        chatId,
        "❌ Email inválido. Por favor, tente novamente:",
      );
    }
  }
  private async confirmPixPayment(
    chatId: number,
    messageId: number,
    userid: number = 0,
    bot: TelegramBot,
    supabase_botId:number
  ): Promise<void> {
    const userData = this.userDataMap.get(chatId);
    if (!userData?.email) {
      return this.handlePix(chatId, messageId, bot);
    }
    const paymentInfo = await createPayment({
      buyer_email: userData.email,
      description: "My Product",
      paymentMethodId: "pix",
      transaction_amount: 2,
      bot: supabase_botId
    });
    UpdatePaymentWithChatId(userid, paymentInfo.id ?? 0);

    const pixCode = paymentInfo.point_of_interaction?.transaction_data?.qr_code;
    await this.sendpixMessage(pixCode, chatId, messageId, bot);
    // Store payment info for verification
    this.paymentData.set(chatId, {
      pixCode: pixCode ?? "",
      timestamp: new Date(),
      status: "pending",
      payment_id: paymentInfo.id ?? 0,
    });

    // Clear user data
    this.userDataMap.delete(chatId);
  }
  private async sendpixMessage(
    pixCode: string = "",
    chatId: number,
    messageId: number,
    bot: TelegramBot
  ) {
    const qrCodeBuffer = await QRCode.toBuffer(pixCode ?? "", {
      errorCorrectionLevel: "H",
      margin: 3,
      width: 300,
      type: "png",
    });

    const message = "✅ Pagamento gerado com sucesso!\n\n" +
      "Escaneie o QR Code acima ou copie o código PIX:\n\n" +
      `\`${pixCode}\``;

    const backButton = this.getRestartButton();
    await bot.deleteMessage(chatId, messageId);

    await bot.sendPhoto(chatId, qrCodeBuffer, {
      caption: message,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [this.getcheckPaymentButton(), backButton],
      },
    });
    return pixCode;
  }

  private cancelPixPayment(chatId: number, messageId: number, bot: TelegramBot): void {
    // Clear user data
    this.userDataMap.delete(chatId);

    const message = "❌ Pagamento cancelado. Voltando ao menu principal...";

    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: this.mainKeyboard.reply_markup,
    });
    this.paymentData.set(chatId, {
      pixCode: "",
      timestamp: new Date(),
      status: "failed",
      payment_id: 0,
    });
  }

  private async verifyPayment(
    chatId: number,
    messageId: number,
    userid: number = 0,
    bot: TelegramBot,
    supabase_botId: number,
  ): Promise<void> {
    const info = await getPaymentInfoByTelegramId(userid, supabase_botId);
    if (!info) {
      await bot.editMessageCaption(
        "❌ Desculpe, não foi possível encontrar os dados do pagamento. Por favor, tente novamente.",
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: "Voltar ao Menu Principal ↩️", callback_data: "back" }],
            ],
          },
        },
      );
      return;
    }
    try {
      if (info.status == "approved") {
        await activatePlan(info.id ?? 0, info.status_detail);
        const inviteLink = await createInvite(bot);
        await bot.sendMessage(
          chatId,
          "✅ Pagamento aprovado com sucesso!\n\n" +
            "🎉 Seu acesso já está liberado.\n" +
            "🌟 Bem-vindo ao canal VIP!\n\n" +
            "📱 Clique no botão abaixo para entrar no grupo exclusivo.\n",
          {
            reply_markup: {
              inline_keyboard: [
                [{
                  text: "🔓 Entrar no Grupo VIP",
                  url: inviteLink,
                }],
                [{
                  text: "Voltar ao Menu Principal ↩️",
                  callback_data: "back",
                }],
              ],
            },
          },
        );
      } else {
        await bot.editMessageCaption(
          "⏳ Pagamento ainda não confirmado.\n\n" +
            "Por favor, verifique se:\n" +
            "• O pagamento foi realizado corretamente\n" +
            "• Aguarde alguns instantes e tente novamente\n\n" +
            "📝 Se o problema persistir, entre em contato com o suporte.",
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{
                  text: "✅ Verificar Novamente",
                  callback_data: "verify_payment",
                }],
                [{
                  text: "Voltar ao Menu Principal ↩️",
                  callback_data: "back",
                }],
              ],
            },
          },
        );
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      await bot.sendMessage(
        chatId,
        "❌ Erro ao verificar o pagamento. Por favor, tente novamente em instantes.\n\n" +
          "/restart - para recomeçar o processo!",
        {
          reply_to_message_id: messageId,
        },
      );
    }
  }

  private handlePix(chatId: number, messageId: number, bot: TelegramBot): void {
    // Initialize user data collection
    this.userDataMap.set(chatId, { currentField: "email" });

    const message = "💰 Pagamento via PIX\n\n" +
      "Por favor, digite seu email:";

    const cancelButton: { reply_markup: InlineKeyboardMarkup } = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Cancelar Pagamento ❌", callback_data: "cancel_pix" }],
        ],
      },
    };

    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: cancelButton.reply_markup,
    });
  }

  private handleRestart(chatId: number, bot: TelegramBot): void {
    const restartMessage = "🔄 Bot reiniciado!\n\n" +
      "Comandos disponíveis:\n" +
      "/start - Iniciar conversa\n" +
      "/restart - Reiniciar conversa\n\n" +
      "Escolha uma opção abaixo:";

    // Delete previous messages (optional)
    bot.deleteMessage(chatId, chatId)
      .catch(() => {}); // Ignore errors if message doesn't exist

    // Send new welcome message with main menu
    bot.sendMessage(chatId, restartMessage, this.mainKeyboard);
  }

  private sendMainMenu(chatId: number,bot: TelegramBot ,messageId?: number ): void {
    const text = "Bem-vindo! Por favor, escolha uma das opções abaixo:";

    if (messageId) {
      bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        ...this.mainKeyboard,
      });
    } else {
      bot.sendMessage(chatId, text, this.mainKeyboard);
    }
  }

  private getBackButton() {
    return [{ text: "Voltar ao Menu Principal ↩️", callback_data: "back" }];
  }
  private getPixButton() {
    return [{ text: "Pagamento em Pix ↩️", callback_data: "pix" }];
  }
  private getRestartButton() {
    return [{ text: "Voltar ao Menu Principal ↩️", callback_data: "restart" }];
  }
  private getcheckPaymentButton() {
    return [{
      text: "✅ Verificar Pagamento",
      callback_data: "verify_payment",
    }];
  }
  // Validation helpers
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async handleVIP(
chatId: number, messageId: number, userid: number = 0, bot: TelegramBot, supabase_botId: number
  ) {
    const info = await getPaymentInfoByTelegramId(userid, supabase_botId);
    const isExpire = await isExpired(userid);
    if (info) {
      if (info.status == "pending") {
        const pixCode = info.point_of_interaction?.transaction_data?.qr_code;
        //store data for payment to be used in other commands locally
        this.paymentData.set(chatId, {
          pixCode: pixCode ?? "",
          timestamp: new Date(),
          status: "pending",
          payment_id: info.id ?? 0,
        });
        await this.sendpixMessage(pixCode, chatId, messageId, bot);
        return;
      } else if (info.status == "approved") {
        if (!isExpire) {
          this.verifyPayment(chatId, messageId, userid, bot, supabase_botId);
          return;
        }
      }
    }
    bot.sendMessage(
      chatId,
      "Área VIP 🌟\n\n" +
        "Benefícios exclusivos para membros VIP:\n" +
        "• Atendimento prioritário\n" +
        "• Conteúdo exclusivo\n" +
        "• Descontos especiais\n\n",
      {
        reply_markup: {
          inline_keyboard: [this.getPixButton(), this.getBackButton()],
        },
      },
    );
  }

  private handleSupport(chatId: number, messageId: number, bot: TelegramBot): void {
    bot.editMessageText(
      "Suporte 💬\n\n" +
        "Como podemos ajudar?\n\n" +
        "Entre em contato através de:\n" +
        "📧 Email: suporte@noblespace.pro\n" +
        "⏰ Horário de atendimento: Seg-Sex, 9h-18h",
      {
        chat_id: chatId,
        message_id: messageId,
        ...this.getBackButton(),
      },
    );
  }

  private handleAbout(chatId: number, messageId: number, bot: TelegramBot): void {
    bot.editMessageText(
      "Sobre Nós ℹ️\n\n" +
        "Somos uma empresa dedicada a fornecer o melhor serviço para nossos clientes.\n\n" +
        "🌐 Website: www.exemplo.com\n" +
        "📍 Localização: São Paulo, SP\n" +
        "📱 Redes Sociais: @exemplo",
      {
        chat_id: chatId,
        message_id: messageId,
        ...this.getBackButton(),
      },
    );
  }

  public getBotStatus(): Array<{ groupId: string | undefined , status: string }> {
    return Array.from(this.bots.values()).map(({ groupId }) => ({
        groupId,
        status: 'running'
    }));
}

public getBotByToken(token: string): BotInstance | undefined {
    return this.bots.get(token);
}

  public start(): void {
    console.log("Bot iniciado com sucesso! Pressione Ctrl+C para encerrar.");
  }
}
