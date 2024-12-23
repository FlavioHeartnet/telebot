import { InlineKeyboardButton } from "node-telegram-bot-api";
import { supabaseAdmin } from "../supabase";
import { dbErrorsCheck } from "../db_errors";
export type ProductType = "channel" | "single" | "supergroup";
export type SupabaseProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  bot: number;
  isActive: boolean;
  type: ProductType;
  preview_content: string;
  content: string;
  period: number;
};
export interface GroupedProducts {
  channel: SupabaseProduct[];
  single: SupabaseProduct[];
  supergroup: SupabaseProduct[];
}
async function getProductsFromDb(bot_id:number){
  const {error , data} = await supabaseAdmin().from("products").select("*").eq("bot", bot_id);
  dbErrorsCheck(error);
  if(!data){
    throw new Error("No products found");
  }
  return data as SupabaseProduct[];
}
export async function getProductsGroupsByBot(bot_id: number) {
  try{
    const products = await getProductsFromDb(bot_id);
    const botProducts = products.filter((a) => a.bot === bot_id);
    return groupProductsByType(botProducts);
  }catch(e){
    return {} as GroupedProducts;
  }
  
}

export function findProductFromGrouped(
  type: ProductType,
  id: number,
  groupedProducts: GroupedProducts,
): SupabaseProduct | null {
  // Get the correct array based on type
  const products = groupedProducts[type];

  // Find the product with matching id
  return products.find((product) => product.id === id) || null;
}

export function getKeyboardsByGroup(products: GroupedProducts) {
  const options: InlineKeyboardButton[][] = [];

  // Check for channel products
  if (products.channel.length > 0) {
    options.push([{
      text: "Canal VIP",
      callback_data: "product_channels",
    }]);
  }

  // Check for single products
  if (products.single.length > 0) {
    options.push([{
      text: "Packs",
      callback_data: "product_singles",
    }]);
  }

  // Check for supergroup products
  if (products.supergroup.length > 0) {
    options.push([{
      text: "Grupo VIP",
      callback_data: "product_supergroups",
    }]);
  }

  return options;
}

export function getKeyboardsByProducts(products: SupabaseProduct[]) {
  return products.map((product) => {
    return [
      {
        text: `${product.name} - R$ ${product.price} 💰`,
        callback_data: `product_${product.type}_${product.id}`,
      } as InlineKeyboardButton,
    ];
  });
}

function groupProductsByType(products: SupabaseProduct[]): GroupedProducts {
  const initialGroups: GroupedProducts = {
    channel: [],
    single: [],
    supergroup: [],
  };

  return products.reduce((groups, product) => {
    // Remove any extra whitespace from type to handle potential spacing issues
    const cleanType = product.type.trim() as keyof GroupedProducts;
    groups[cleanType].push(product);
    return groups;
  }, initialGroups);
}
