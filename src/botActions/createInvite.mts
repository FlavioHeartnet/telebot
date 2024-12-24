import TelegramBot from "node-telegram-bot-api";
import { SupabaseProduct } from "../db/usecases/get_products_bot.ts";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";

export async function createInvite(
  product: SupabaseProduct,
  bot: TelegramBot,
  chatId: number,
) {
  switch (product.type) {
    case "channel":
    case "supergroup":
      return product.content;
    case "single":
      let downloadedFile:
        | { filePath: string; mimeType: string; ext: string }
        | null = null;
      downloadedFile = await downloadAndDetectType(product.content);
      // Determine media type and send accordingly
      if (downloadedFile.mimeType.startsWith("image/")) {
        bot.sendPhoto(chatId, downloadedFile.filePath, {
          caption: product.description,
        });
      } else if (downloadedFile.mimeType.startsWith("video/")) {
        bot.sendVideo(chatId, downloadedFile.filePath, {
          caption: product.description,
        });
      } else {
        bot.sendDocument(chatId, downloadedFile.filePath, {
          caption: product.description,
        });
      }
      cleanupTempFile(downloadedFile.filePath);
      break;
  }
}

export async function downloadAndDetectType(url: string): Promise<{
  filePath: string;
  mimeType: string;
  ext: string;
}> {
  try {
    // Download file
    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });

    // Detect file type
    const fileType = await fileTypeFromBuffer(response.data);
    if (!fileType) {
      throw new Error("Could not detect file type");
    }

    const tempDir = "./tmp";
    // Generate temporary file path
    const fileName = `${Date.now()}-${
      Math.random().toString(36).substring(7)
    }.${fileType.ext}`;
    const filePath = path.join(tempDir, fileName);

    // Save file
    await fs.promises.writeFile(filePath, response.data);

    return {
      filePath,
      mimeType: fileType.mime,
      ext: fileType.ext,
    };
  } catch (error) {
    throw new Error(`Failed to download or process file: ${error}`);
  }
}

/**
 * Clean up temporary file
 */
async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.error(`Failed to cleanup temp file ${filePath}:`, error);
  }
}
