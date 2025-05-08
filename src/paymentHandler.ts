import TelegramBot, { InlineKeyboardMarkup } from "node-telegram-bot-api";
import createPayment from "./payment/payment.ts"; // Assuming this is your payment gateway interaction
import QRCode from "qrcode";
import UpdatePaymentWithChatId from "./payment/update_payment.ts";
import activatePlan from "./db/usecases/activate_plan.ts"; // Assuming this is your database interaction
import { createInvite } from "./botActions/createInvite.ts"; // Assuming this is your invite link creation logic
import { UserManager } from "./userManager.ts";
import { SupabaseService } from "./supabaseService.ts";
import { MessageFormatter } from "./messageFormatter.ts";
import { SupabaseProduct } from "./db/usecases/get_products_bot.ts"; // Assuming product type definition

export class PaymentHandler {
  constructor(
    private userManager: UserManager,
    private supabaseService: SupabaseService,
    private messageFormatter: MessageFormatter,
    private bot: TelegramBot, // The TelegramBot instance for sending messages
    private botId: number, // The ID of the current bot
  ) {}

  public async handlePix(chatId: number, messageId: number): Promise<void> {
    this.userManager.setUserData(chatId, { currentField: "email" });

    const message = "💰 Pagamento via PIX\\n\\n" +
      "Por favor, digite seu email:";

    const cancelButton = this.messageFormatter.getCancelPixButton();

    this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: cancelButton.reply_markup,
    });
  }

  public async handleUserInput(
    chatId: number,
    text: string,
    userData: UserData,
  ): Promise<void> {
    if (this.validateEmail(text)) {
      userData.currentField = "email";
      userData.email = text;
      this.userManager.setUserData(chatId, userData);

      const message = "✅ Dados confirmados!\\n\\n" +
        `Email: ${text}\\n` +
        "Deseja confirmar o pagamento?";

      const confirmButtons = this.messageFormatter.getConfirmCancelPixButtons();

      this.bot.sendMessage(chatId, message, confirmButtons);
    } else {
      this.bot.sendMessage(
        chatId,
        "❌ Email inválido. Por favor, tente novamente:",
      );
    }
  }

  public async confirmPixPayment(
    chatId: number,
    messageId: number,
    userId: number = 0,
    selectedProduct: SupabaseProduct | null | undefined,
  ): Promise<void> {
    const userData = this.userManager.getUserData(chatId);
    if (!userData?.email) {
      return this.handlePix(chatId, messageId);
    }
    if (!selectedProduct) {
      this.bot.sendMessage(
        chatId,
        "❌ Algo deu errado com sua compra, por favor reinicie o bot: /restart",
      );
      return;
    }
    try {
      const paymentInfo = await createPayment({
        buyer_email: userData.email,
        description: selectedProduct.name,
        paymentMethodId: "pix",
        transaction_amount: selectedProduct.price,
        bot: this.botId,
        product: selectedProduct.id,
      });
      UpdatePaymentWithChatId(userId, paymentInfo.id ?? 0);

      const pixCode = paymentInfo.point_of_interaction?.transaction_data
        ?.qr_code;
      if (pixCode) {
        await this.sendPixMessage(pixCode, chatId, messageId);
        // Note: Storing payment data in PaymentHandler if needed for verification logic
        // this.paymentData.set(chatId, { ... });
      } else {
        throw new Error("Failed to generate PIX code");
      }
    } catch (e) {
      console.error("Error creating payment:", e);
      this.bot.sendMessage(
        chatId,
        "❌ Algo deu errado ao processar seu pagamento, tente novamente reiniciando o bot ou entre em contato com nosso suporte",
        {
          reply_markup: {
            inline_keyboard: [
              this.messageFormatter.getRestartButton(),
              this.messageFormatter.getSupportButton(),
            ],
          },
        },
      );
    }

    this.userManager.deleteUserData(chatId);
  }

  private async sendPixMessage(
    pixCode: string,
    chatId: number,
    messageId: number,
  ) {
    const qrCodeBuffer = await QRCode.toBuffer(pixCode, {
      errorCorrectionLevel: "H",
      margin: 3,
      width: 300,
      type: "png",
    });

    const message = "✅ Pagamento gerado com sucesso!\\n\\n" +
      "Escaneie o QR Code acima ou copie o código PIX:\\n\\n" +
      `\`${pixCode}\``;

    const backButton = this.messageFormatter.getRestartButton();
    await this.bot.deleteMessage(chatId, messageId);

    await this.bot.sendPhoto(chatId, qrCodeBuffer, {
      caption: message,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          this.messageFormatter.getCheckPaymentButton(),
          backButton,
        ],
      },
    });
  }

  public cancelPixPayment(chatId: number, messageId: number): void {
    this.userManager.deleteUserData(chatId);

    const message = "❌ Pagamento cancelado. Voltando ao menu principal...";

    this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
    });
    // Note: Need a way to get productsGroup here, perhaps from a BotManager or passed in
    // this.messageFormatter.sendMainMenu(chatId, this.bot, this.botId, productsGroup, messageId);
  }

  public async verifyPayment(
    chatId: number,
    messageId: number,
    userId: number = 0,
    selectedProduct: SupabaseProduct | null | undefined,
  ): Promise<void> {
    const info = await this.supabaseService.getPaymentInfoByTelegramId(
      userId,
      this.botId,
      selectedProduct?.id || 0,
    );
    if (!info) {
      await this.bot.editMessageCaption(
        "❌ Desculpe, não foi possível encontrar os dados do pagamento. Por favor, tente novamente.",
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [this.messageFormatter.getBackButton()],
          },
        },
      );
      return;
    }
    try {
      if (info.status == "approved") {
        await activatePlan(info.id ?? 0, info.status_detail); // Assuming activatePlan is a separate function or moved to SupabaseService
        if (!selectedProduct) {
          await this.bot.sendMessage(
            chatId,
            "❌ Algo deu errado com sua compra, por favor reinicie o bot: /restart",
          );
          return;
        }
        const inviteLink = await createInvite(
          selectedProduct,
          this.bot,
          chatId,
        ); // Assuming createInvite is a separate function
        await this.bot.sendMessage(
          chatId,
          "✅ Pagamento aprovado com sucesso!\\n\\n" +
            "🎉 Seu acesso já está liberado.\\n" +
            "🌟 Bem-vindo ao canal VIP!\\n\\n" +
            "📱 Clique no botão abaixo para entrar no grupo exclusivo.\\n",
          {
            reply_markup: {
              inline_keyboard: [
                [{
                  text: "🔓 Entrar no Grupo VIP",
                  url: inviteLink,
                }],
                this.messageFormatter.getBackButton(),
              ],
            },
          },
        );
      } else {
        await this.bot.editMessageCaption(
          "⏳ Pagamento ainda não confirmado.\\n\\n" +
            "Por favor, verifique se:\\n" +
            "• O pagamento foi realizado corretamente\\n" +
            "• Aguarde alguns instantes e tente novamente\\n\\n" +
            "📝 Se o problema persistir, entre em contato com o suporte.",
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                this.messageFormatter.getCheckPaymentButton(),
                this.messageFormatter.getBackButton(),
              ],
            },
          },
        );
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Erro ao verificar o pagamento. Por favor, tente novamente em instantes.\\n\\n" +
          "/restart - para recomeçar o processo!",
        {
          reply_to_message_id: messageId,
        },
      );
    }
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}