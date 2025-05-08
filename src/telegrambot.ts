import TelegramBot from "node-telegram-bot-api";
import {
  findProductFromGrouped,
  getKeyboardsByGroup,
  getProductsGroupsByBot,
  GroupedProducts,
  ProductType,
  SupabaseProduct,
} from "./db/usecases/get_products_bot.ts";
import { BotInitializer } from "./botInitializer.ts";
import { UserManager } from "./userManager.ts";
import { PaymentHandler } from "./paymentHandler.ts";
import { SupabaseService } from "./supabaseService.ts";
import { MessageFormatter } from "./messageFormatter.ts";
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
}

interface BotInstance {
  bot: TelegramBot;
  bot_id: number;
  groupId?: string;
  botProducts: GroupedProducts;
}
export class TelegramBotApp {
  private botInitializer: BotInitializer;
  private userManager: UserManager;
  private paymentHandler: PaymentHandler;
  private supabaseService: SupabaseService;
  private messageFormatter: MessageFormatter;

  constructor() {
    this.userManager = new UserManager();
    this.supabaseService = new SupabaseService();
    this.messageFormatter = new MessageFormatter();
  }
  private bots: Map<number, BotInstance> = new Map();
  private selectedProduct: Map<number, SupabaseProduct | null> = new Map();

  constructor() {}

  public async initializeBot(config: BotConfig) {
    const bot = new TelegramBot(config.token, config.options);
    const botProducts = await getProductsGroupsByBot(config.id);
    const instance = {
      bot: bot,
      bot_id: config.id,
      groupId: config.groupId,
      botProducts: botProducts,
    };
    this.botInitializer = new BotInitializer(config);
    this.paymentHandler = new PaymentHandler(
      this.userManager,
      this.supabaseService,
      this.messageFormatter,
    );
    this.bots.set(config.id, instance);
    this.initializeHandlers(instance);
  }

  private initializeHandlers(instance: BotInstance): void {
    const { bot, bot_id, botProducts: products } = instance;
    // Start command - shows the main menu
    bot.onText(/\/start/, (msg) => {
      this.messageFormatter.sendMainMenu(
        msg.chat.id,
        bot,
        bot_id,
        products,
      );
    });

    bot.onText(/\/restart/, (msg) => {
      this.botInitializer.handleRestart(msg.chat.id, bot, bot_id, products);
    });

    bot.on("message", (msg) => {
      this.botInitializer.handleMessage(msg, bot, this.userManager);
    });

    // Handle inline keyboard callbacks
    bot.on("callback_query", (callbackQuery) => {
      const chatId = callbackQuery.message?.chat.id ?? 0;
      const messageId = callbackQuery.message?.message_id ?? 0;
      const userid = callbackQuery.from.id ?? 0;
      if (!chatId || !messageId || !callbackQuery.data) return;

      const productMatch = callbackQuery.data.match(
        /^product_(channel|single|supergroup)_(\d+)$/,
      );
      if (productMatch) {
        const [_, type, idStr] = productMatch;
        const id = parseInt(idStr, 10);
        const selectedProduct = findProductFromGrouped(
          type as ProductType,
          id,
          products,
        );
        this.selectedProduct.set(userid, selectedProduct);
        this.handleProduct(chatId, messageId, userid, bot, bot_id);
        return;
      }

      bot.answerCallbackQuery(callbackQuery.id); // Answer the callback query

      const handlers = {
        pix: () => this.paymentHandler.handlePix(chatId, messageId, bot),
        confirm_pix: () =>
          this.paymentHandler.confirmPixPayment(
            chatId,
            messageId,
            userid,
            bot,
            bot_id,
          ),
        cancel_pix: () =>
          this.paymentHandler.cancelPixPayment(chatId, messageId, bot, bot_id),
        support: () => this.messageFormatter.handleSupport(chatId, messageId, bot),
        about: () => this.messageFormatter.handleAbout(chatId, messageId, bot),
        back: () =>
          this.messageFormatter.sendMainMenu(chatId, bot, messageId, products),
        restart: () => this.botInitializer.handleRestart(chatId, bot, bot_id, products),
        verify_payment: () =>
          this.paymentHandler.verifyPayment(
            chatId,
            messageId,
            userid,
            bot,
            bot_id,
          ),
        product_channels: () =>
          this.messageFormatter.handleGroupProductChannels(chatId, messageId, bot, bot_id, products),
        product_singles: () =>
          this.messageFormatter.handleGroupProductPacks(chatId, bot, bot_id,products),
      }
      handlers[callbackQuery.data as keyof typeof handlers]?.();
    });
  }

  private async handleProduct(
    chatId: number,
    messageId: number,
    userid: number = 0,
    bot: TelegramBot,
    supabase_botId: number,
  ) {
    const selectedProduct = this.selectedProduct.get(userid) ?? null;

    const info = await this.supabaseService.getPaymentInfoByTelegramId(
      userid,
      supabase_botId,
      selectedProduct?.id ?? 0,
    );
    const isExpire = await this.supabaseService.isExpired(userid, selectedProduct?.id ?? 0);

    if (info) {
      if (info.status == "pending") {
        const pixCode = info.point_of_interaction?.transaction_data?.qr_code;
        //store data for payment to be used in other commands locally
        /*
        this.paymentData.set(chatId, {
          pixCode: pixCode ?? "",
          timestamp: new Date(),
          status: "pending",
          payment_id: info.id ?? 0,
        });
        await this.sendpixMessage(pixCode, chatId, messageId, bot);
        */
        return;
      } else if (info.status == "approved") {
        if (!isExpire) {
            await this.paymentHandler.verifyPayment(chatId, messageId, userid, bot, supabase_botId)
            return;
        }
      }
    }
    const text =
      selectedProduct?.description + "\n\n Escolha sua forma de pagamento:" ||
      "Área VIP 🌟\n\n" +
        "Benefícios exclusivos para membros VIP:\n" +
        "• Conteúdo exclusivo\n" +
        "• Descontos especiais\n\n";
    bot.sendMessage(
      chatId,
      text,
      this.messageFormatter.getPaymentOptionsKeyboard()
    );
  }




  public getBotStatus(): Array<
    { groupId: string | undefined; status: string }
  > {
    return Array.from(this.bots.values()).map(({ groupId }) => ({
      groupId,
      status: "running",
    }));
  }

  public getBotByToken(bot_id: number): BotInstance | undefined {
    return this.bots.get(bot_id);
  }

  public start(): void {
    console.log("Bot iniciado com sucesso! Pressione Ctrl+C para encerrar.");
  }
}
