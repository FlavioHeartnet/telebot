import TelegramBot, { InlineKeyboardMarkup, InlineKeyboardButton } from "node-telegram-bot-api";
import { GroupedProducts, getKeyboardsByGroup, getKeyboardsByProducts, SupabaseProduct } from "./db/usecases/get_products_bot.ts";

interface KeyboardOptions {
  reply_markup?: InlineKeyboardMarkup;
}

export class MessageFormatter {

  private getBackButton(): InlineKeyboardButton[] {
    return [{ text: "Voltar ao Menu Principal ↩️", callback_data: "back" }];
  }

  private getPixButton(): InlineKeyboardButton[] {
    return [{ text: "Pagamento em Pix ↩️", callback_data: "pix" }];
  }

  private getRestartButton(): InlineKeyboardButton[] {
    return [{ text: "Voltar ao Menu Principal ↩️", callback_data: "restart" }];
  }

  private getCheckPaymentButton(): InlineKeyboardButton[] {
    return [{
      text: "✅ Verificar Pagamento",
      callback_data: "verify_payment",
    }];
  }

  private getSupportButton(): InlineKeyboardButton[] {
    return [{
      text: "Suporte 💬",
      callback_data: "support",
    }];
  }

  public formatMainMenu(text: string, productsGroup: GroupedProducts): KeyboardOptions {
    const keyboard = [...getKeyboardsByGroup(productsGroup), this.getSupportButton()];
    return {
      reply_markup: {
        inline_keyboard: keyboard,
      },
    };
  }

  public formatProductSelectionMenu(products: SupabaseProduct[]): KeyboardOptions {
    return {
      reply_markup: {
        inline_keyboard: getKeyboardsByProducts(products),
      },
    };
  }

  public formatProductMessage(product: SupabaseProduct | null): { text: string; options: KeyboardOptions } {
    const text =
      product?.description + "\\n\\n Escolha sua forma de pagamento:" ||
      "Área VIP 🌟\\n\\n" +
      "Benefícios exclusivos para membros VIP:\\n" +
      "• Conteúdo exclusivo\\n" +
      "• Descontos especiais\\n\\n";
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [this.getPixButton(), this.getBackButton()],
      },
    };
    return { text, options };
  }


  public formatEmailPrompt(): { text: string; options: KeyboardOptions } {
    const text = "💰 Pagamento via PIX\\n\\n" +
      "Por favor, digite seu email:";
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Cancelar Pagamento ❌", callback_data: "cancel_pix" }],
        ],
      },
    };
    return { text, options };
  }

  public formatEmailConfirmation(email: string): { text: string; options: KeyboardOptions } {
    const text = "✅ Dados confirmados!\\n\\n" +
      `Email: ${email}\\n` +
      "Deseja confirmar o pagamento?";
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Confirmar Dados ✅", callback_data: "confirm_pix" }],
          [{ text: "Cancelar Pagamento ❌", callback_data: "cancel_pix" }],
        ],
      },
    };
    return { text, options };
  }

  public formatPixMessage(pixCode: string): { caption: string; options: KeyboardOptions; parse_mode: "Markdown" } {
    const caption = "✅ Pagamento gerado com sucesso!\\n\\n" +
      "Escaneie o QR Code acima ou copie o código PIX:\\n\\n" +
      `\\\`${pixCode}\\\``; // Using triple backticks for code block
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [this.getCheckPaymentButton(), this.getRestartButton()],
      },
    };
    return { caption, options, parse_mode: "Markdown" };
  }

  public formatPaymentCancelledMessage(): { text: string; options?: KeyboardOptions } {
    return { text: "❌ Pagamento cancelado. Voltando ao menu principal..." };
  }

  public formatPaymentNotFoundMessage(): { caption: string; options: KeyboardOptions } {
    const caption = "❌ Desculpe, não foi possível encontrar os dados do pagamento. Por favor, tente novamente.";
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [this.getBackButton()],
      },
    };
    return { caption, options };
  }

  public formatPaymentPendingMessage(): { caption: string; options: KeyboardOptions } {
    const caption = "⏳ Pagamento ainda não confirmado.\\n\\n" +
      "Por favor, verifique se:\\n" +
      "• O pagamento foi realizado corretamente\\n" +
      "• Aguarde alguns instantes e tente novamente\\n\\n" +
      "📝 Se o problema persistir, entre em contato com o suporte.";
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [this.getCheckPaymentButton(), this.getBackButton()],
      },
    };
    return { caption, options };
  }

  public formatPaymentApprovedMessage(inviteLink: string): { text: string; options: KeyboardOptions } {
    const text = "✅ Pagamento aprovado com sucesso!\\n\\n" +
      "🎉 Seu acesso já está liberado.\\n" +
      "🌟 Bem-vindo ao canal VIP!\\n\\n" +
      "📱 Clique no botão abaixo para entrar no grupo exclusivo.\\n";
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [
          [{
            text: "🔓 Entrar no Grupo VIP",
            url: inviteLink,
          }],
          this.getBackButton(),
        ],
      },
    };
    return { text, options };
  }

  public formatPaymentErrorMessage(): { text: string; options: KeyboardOptions } {
    const text = "❌ Algo deu errado ao processar seu pagamento, tente novamente reiniciando o bot ou entre em contato com nosso suporte";
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [this.getRestartButton(), this.getSupportButton()],
      },
    };
    return { text, options };
  }

  public formatRestartMessage(): { text: string; options: KeyboardOptions } {
    const text = "🔄 Bot reiniciado!\\n\\n" +
      "Comandos disponíveis:\\n" +
      "/start - Iniciar conversa\\n" +
      "/restart - Reiniciar conversa\\n\\n" +
      "Escolha uma opção abaixo:";
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [this.getSupportButton()], // Will be combined with product options later
      },
    };
    return { text, options };
  }

  public formatSupportMessage(): { text: string; options: KeyboardOptions } {
    const text = "Suporte 💬\\n\\n" +
      "Como podemos ajudar?\\n\\n" +
      "Entre em contato através de:\\n" +
      "📧 Email: suporte@noblespace.pro\\n" +
      "⏰ Horário de atendimento: Seg-Sex, 9h-18h";
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [this.getBackButton()],
      },
    };
    return { text, options };
  }

  public formatAboutMessage(): { text: string; options: KeyboardOptions } {
    const text = "Sobre Nós ℹ️\\n\\n" +
      "Somos uma empresa dedicada a fornecer o melhor serviço para nossos clientes.\\n\\n" +
      "🌐 Website: www.exemplo.com\\n" +
      "📍 Localização: São Paulo, SP\\n" +
      "📱 Redes Sociais: @exemplo";
    const options: KeyboardOptions = {
      reply_markup: {
        inline_keyboard: [this.getBackButton()],
      },
    };
    return { text, options };
  }
}