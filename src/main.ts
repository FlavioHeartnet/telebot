import { getUserBots } from "./db/usecases/get_user_bots";
import { TelegramBotApp } from "./telegrambot.ts";
import express from "express";

const app = express();
const port = process.env.PORT || 3001;

app.get("/bot/status", (req, res) => {
  res.status(200).json({
    status: "running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
const bot = new TelegramBotApp();

// Start server and bots
async function startServer() {
  try {
    const configs = await getUserBots();

    if (configs && configs.length > 0) {
      configs.forEach((config) => {
        // Start the bots
        bot.initializeBot(config);
        console.log("🤖 All bots initialized");
        
      });
    } else {
      console.log("Sem Bots ativos para inicializar.");
    }

    app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
      
    });

    
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Add your error reporting here
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  // Add your error reporting here
});
