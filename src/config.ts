import dotenv from "dotenv";

dotenv.config();

export const config = {
  access_token: process.env.ACCESS_TOKEN,
  telegramBotKey: process.env.TELEGRAM_BOT_TOKEN,
  supabase_url: process.env.SUPABASE_URL,
  supabase_secret: process.env.SUPABASE_SECRET,
  supabase_anon: process.env.SUPABASE_ANON_KEY,
};
