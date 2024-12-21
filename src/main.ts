import { config } from "./config";
import { BotConfig, TelegramBotApp } from "./telegrambot";


// Configuration
const configuration: BotConfig = {
  token: config.telegramBotKey || "",
  options: {
    polling: true,
  },
};

// Start the bot
const bot = new TelegramBotApp(configuration);
bot.start();
