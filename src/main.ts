import { supabaseAdmin } from "./db/supabase.ts";
import { getUserBots } from "./db/usecases/get_user_bots.ts";
import { BotConfig, TelegramBotApp } from "./telegrambot.ts";
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

let ActiveBots: TelegramBotApp[] = []; 
// Start server and bots
async function startServer() {
  try {
    ActiveBots = []; // Clear the active bots array
    // Initialize the Supabase client
    const configs = await getUserBots();
    if (configs && configs.length > 0) {
      startBots(configs);
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
const changes = supabaseAdmin()
  .channel('table-db-changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'bots',
      filter: 'status=eq.active',
    },
    (payload) => {
      console.log('Change received!', payload);
      const bot = payload.new;
      const config = {
        id: bot.id,
        token: bot.bot_token,
        groupId: bot.bot_id_group,
        options: {
          polling: true,
        }
      } as BotConfig;
      startBots([config]);
    }
  )
  .subscribe();
//TODO Create another channel when a bot is deleted
//code here

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
function startBots(configs: BotConfig[]) {
  configs.forEach(async (config, i) => {
    // Start the bots
    const bot = new TelegramBotApp();
    await bot.initializeBot(config);
    ActiveBots.push(bot);
    console.log(`🤖 Bot ${bot.botName} initialized`);
    if(configs.length - 1 === i) {
      console.log("🤖 All bots initialized");
    }
  });
}

