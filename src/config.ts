import dotenv from 'dotenv';

dotenv.config();

export const config = {
    access_token: process.env.ACCESS_TOKEN,
    telegramBotKey: process.env.TELEGRAM_BOT_TOKEN
}