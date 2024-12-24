import { BotConfig } from "../../telegrambot.ts";
import { dbErrorsCheck } from "../db_errors";
import { supabaseAdmin } from "../supabase";

export async function getUserBots() {
  const { data, error } = await supabaseAdmin().from("bots")
    .select("bot_token, id, bot_id_group").eq("status", "active");
  dbErrorsCheck(error);
  return data?.map((bot) => {
    return {
      id: bot.id,
      token: bot.bot_token,
      groupId: bot.bot_id_group,
      options: {
        polling: true,
      },
    } as BotConfig;
  });
}
