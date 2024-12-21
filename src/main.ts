import { getUserBots } from "./db/usecases/get_user_bots";
import { TelegramBotApp } from "./telegrambot";

// Configuration
getUserBots().then((configs) => {
  if (configs) {
    configs.forEach((config) => {
      // Start the bots
      const bot = new TelegramBotApp(config);
      bot.start();
    });
  } else {
    console.log("Sem Bots ativos para inicializar.");
  }
});
