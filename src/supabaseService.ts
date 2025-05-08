import 
  activatePlan
 from "./db/usecases/activate_plan.ts";
 import { getProductsGroupsByBot, GroupedProducts } from "./db/usecases/get_products_bot.ts";
import { getWelcomeMessage } from "./db/usecases/get_welcome_message.ts";
import isExpired from "./db/usecases/verify_expired.ts";

import 
  getPaymentInfoByTelegramId
from "./payment/check_payment_user.ts";





export class SupabaseService {
  async getProductsByBot(botId: number): Promise<GroupedProducts> {
    return getProductsGroupsByBot(botId);
  }

  async activatePlan(paymentId: number, statusDetail: string): Promise<void> {
    await activatePlan(paymentId, statusDetail);
  }

  async getPaymentInfo(
    telegramId: number,
    botId: number,
    productId: number,
  ) {
    return getPaymentInfoByTelegramId(telegramId, botId, productId);
  }

  async getWelcomeMessage(botId: number): Promise<string> {
    return getWelcomeMessage(botId);
  }

  async isExpired(telegramId: number, productId: number) {
    return isExpired(telegramId, productId);
  }
}