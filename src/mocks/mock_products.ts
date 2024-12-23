import { SupabaseProduct } from "../db/usecases/get_products_bot";

export const products:SupabaseProduct[]  = [
    {
        id: 1,
        name: "Premium News Channel",
        description: "Get access to exclusive news content from around the world",
        price: 29.99,
        bot: 5,
        isActive: true,
        type: "channel",
        preview_content: "Stay updated with breaking news and in-depth analysis",
        content: "Full access to our premium news channel with live updates, expert analysis, and exclusive reports",
        period: 1
    },
    {
        id: 2,
        name: "Stock Market Tips",
        description: "Daily stock market insights and trading recommendations",
        price: 19.99,
        bot: 1,
        isActive: true,
        type: "single",
        preview_content: "Expert stock market analysis and daily tips",
        content: "Detailed market analysis, trading strategies, and real-time stock recommendations",
        period: 1
    },
    {
        id: 3,
        name: "Crypto Trading Community",
        description: "Join our cryptocurrency trading community",
        price: 49.99,
        bot: 5,
        isActive: true,
        type: "channel",
        preview_content: "Connect with crypto experts and fellow traders",
        content: "Access to exclusive trading signals, market analysis, and community discussions",
        period: 3
    },
    {
        id: 4,
        name: "Forex Signals",
        description: "Get reliable forex trading signals",
        price: 15.99,
        bot: 1,
        isActive: false,
        type: "supergroup",
        preview_content: "Daily forex signals with high accuracy",
        content: "Professional forex trading signals with entry points, stop loss, and take profit levels",
        period: 2
    },
    {
        id: 5,
        name: "Investment Education Hub",
        description: "Learn investment strategies from experts",
        price: 39.99,
        bot: 5,
        isActive: true,
        type: "channel",
        preview_content: "Comprehensive investment education materials",
        content: "Full library of investment courses, tutorials, and expert webinars",
        period: 6
    }
  ];