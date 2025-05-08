import TelegramBot, {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
} from "node-telegram-bot-api";
import { GroupedProducts } from "./db/usecases/get_products_bot.ts";

export interface BotConfig {
  token: string;
  id: number;
  groupId?: string;
  options: {
    polling: boolean;
  };
}

interface BotInstance {
  bot: TelegramBot;
  bot_id: number;
  groupId?: string;
  botProducts: GroupedProducts;
}

const keyboardData2: InlineKeyboardButton = {
  text: "Suporte 💬",
  callback_data: "support",
};

export class BotInitializer {
  private bot: TelegramBot;
  private botId: number;
  private groupId?: string;
  private botProducts: GroupedProducts;

  constructor(config: BotConfig, botProducts: GroupedProducts) {
    this.bot = new TelegramBot(config.token, config.options);
    this.botId = config.id;
    this.groupId = config.groupId;
    this.botProducts = botProducts;
  }

  public getBotInstance(): BotInstance {
    return {
      bot: this.bot,
      bot_id: this.botId,
      groupId: this.groupId,
      botProducts: this.botProducts,
    };
  }

  public initializeHandlers(
    messageHandler: (msg: TelegramBot.Message, bot: TelegramBot) => void,
    callbackQueryHandler: (callbackQuery: TelegramBot.CallbackQuery, bot: TelegramBot) => void,
    startHandler: (chatId: number, bot: TelegramBot, botId: number, products: GroupedProducts) => void,
    restartHandler: (chatId: number, bot: TelegramBot, botId: number) => void,
  ): void {
    this.bot.onText(/\/start/, (msg) => {
      startHandler(msg.chat.id, this.bot, this.botId, this.botProducts);
    });

    this.bot.onText(/\/restart/, (msg) => {
      restartHandler(msg.chat.id, this.bot, this.botId);
    });

    this.bot.on("message", (msg) => {
      if (msg.text && !msg.text.startsWith("/")) {
        messageHandler(msg, this.bot);
      }
    });

    this.bot.on("callback_query", (callbackQuery) => {
      if (callbackQuery.message?.chat.id) {
        this.bot.answerCallbackQuery(callbackQuery.id); // Answer the callback query
        callbackQueryHandler(callbackQuery, this.bot);
      }
    });
  }

  public startPolling(): void {
    // Start polling if options.polling was true
  }
}