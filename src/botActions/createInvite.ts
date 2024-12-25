import TelegramBot from "node-telegram-bot-api";
import { SupabaseProduct } from "../db/usecases/get_products_bot.ts";


// Types for media messages
interface MediaFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_name?: string;
}

interface PhotoSize extends MediaFile {
  width: number;
  height: number;
}

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
      

  }
}

async function handleMedia(msg: TelegramBot.Message, bot: TelegramBot): Promise<void> {
  try {
      let fileId: string | undefined;
      let fileName = 'downloaded_media';

      // Determine media type and get file_id
      if (msg.photo) {
          // Get the highest quality photo (last in array)
          const photo = msg.photo[msg.photo.length - 1] as PhotoSize;
          fileId = photo.file_id;
          fileName += '.jpg';
      } else if (msg.video) {
          fileId = msg.video.file_id;
         
      } else if (msg.audio) {
          fileId = msg.audio.file_id;
      } else if (msg.voice) {
          fileId = msg.voice.file_id;
      } else if (msg.document) {
          fileId = msg.document.file_id;
          fileName = msg.document.file_name || 'document';
      }

      if (!fileId) {
          await bot.sendMessage(msg.chat.id, 'Sorry, I couldn\'t process this type of media.');
          return;
      }

      // Get file info
      const file = await bot.getFile(fileId);
      if (!file.file_path) {
          throw new Error('Could not get file path');
      }

      // Construct download URL
      //const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
      
      

      await bot.sendMessage(
          msg.chat.id,
          `Media salva com sucesso`
      );

  } catch (error) {
      console.error('Error handling media:', error);
      await bot.sendMessage(
          msg.chat.id,
          `Sorry, an error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
  }
}


