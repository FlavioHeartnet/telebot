import TelegramBot from "node-telegram-bot-api";

export async function createInvite(bot: TelegramBot){
    return await bot.createChatInviteLink(
        5437289104,
        {
          name: `VIP Member - ${new Date().toISOString()}`,
          expire_date: undefined, // Never expires
          member_limit: 1, // One-time use
          creates_join_request: false,
        },
      );
} 
