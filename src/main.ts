import { getUserBots } from "./db/usecases/get_user_bots";
import { TelegramBotApp } from "./telegrambot";
import express from 'express';
const app = express();
const port = process.env.PORT || 3000;

app.get('/bot/status', (req, res) => {
  res.status(200).json({
      status: 'running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
  });
});

app.listen(port, async () => {
  const configs = await getUserBots();

  if (configs) {
    configs.forEach((config) => {
      // Start the bots
      const bot = new TelegramBotApp(config);
      bot.start();
    });
  } else {
    console.log("Sem Bots ativos para inicializar.");
  }
  console.log(`🚀 Server is running on port ${port}`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Add your error reporting here
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  // Add your error reporting here
});
