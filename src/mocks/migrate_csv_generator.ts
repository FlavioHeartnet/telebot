import Papa from 'papaparse';
import { SupabaseProduct } from '../db/usecases/get_products_bot';
import fs from 'fs';
import path from 'path';

function generateProductsCSV(products: SupabaseProduct[], outputPath: string = 'products.csv'): void {
  try {
    // Convert to CSV using PapaParse
    const csv = Papa.unparse(products, {
      header: true,
      delimiter: ',',
      newline: '\n'
    });

    // Ensure the output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(outputPath, csv, 'utf-8');
    console.log(`CSV file successfully generated at: ${outputPath}`);
    
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw error;
  }
}


// Using our mock data
const mockProducts: SupabaseProduct[] = [
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
      period: 0
  },
  {
      id: 3,
      name: "Crypto Trading Community",
      description: "Join our cryptocurrency trading community",
      price: 49.99,
      bot: 5,
      isActive: true,
      type: "supergroup",
      preview_content: "Connect with crypto experts and fellow traders",
      content: "Access to exclusive trading signals, market analysis, and community discussions",
      period: 1
  },
  {
      id: 4,
      name: "Forex Signals",
      description: "Get reliable forex trading signals",
      price: 15.99,
      bot: 1,
      isActive: false,
      type: "single",
      preview_content: "Daily forex signals with high accuracy",
      content: "Professional forex trading signals with entry points, stop loss, and take profit levels",
      period: 0
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
      period: 1
  }
];

// Usage examples:

// 1. Basic usage - saves to products.csv in current directory
generateProductsCSV(mockProducts);

// 2. Custom path - saves to a specific directory
generateProductsCSV(mockProducts, path.join(process.cwd(), 'data', 'products.csv'));

// 3. Async version if needed
async function generateProductsCSVAsync(
  products: SupabaseProduct[], 
  outputPath: string = 'products.csv'
): Promise<void> {
  try {
    const csv = Papa.unparse(products, {
      header: true,
      delimiter: ',',
      newline: '\n'
    });

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.writeFile(outputPath, csv, 'utf-8');
    console.log(`CSV file successfully generated at: ${outputPath}`);
    
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw error;
  }
}
