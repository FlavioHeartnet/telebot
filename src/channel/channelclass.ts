import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";
import { createInterface } from "readline";
import dotenv from "dotenv";

dotenv.config();

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

interface ChannelCreationConfig {
  title: string;
  about: string;
  megagroup?: boolean;
  address?: string;
  broadcast?: boolean;
}

class TelegramChannelCreator {
  private client: TelegramClient;
  private stringSession: StringSession;

  constructor(
    apiId: number,
    apiHash: string,
    sessionString: string = "",
  ) {
    this.stringSession = new StringSession(sessionString);
    this.client = new TelegramClient(
      this.stringSession,
      apiId,
      apiHash,
      { connectionRetries: 5 },
    );
  }

  async initialize(phoneNumber: string): Promise<string> {
    await this.client.start({
      phoneNumber: async () => phoneNumber,
      password: async () =>
        await prompt("Please enter your 2FA password (if enabled): "),
      phoneCode: async () =>
        await prompt("Please enter the code you received: "),
      onError: (err) => console.log(err),
    });

    return this.stringSession.save();
  }

  async createChannel(config: ChannelCreationConfig): Promise<string> {
    try {
      // Create the channel
      const result = await this.client.invoke(
        new Api.channels.CreateChannel({
          title: config.title,
          about: config.about,
          broadcast: !config.megagroup,
          megagroup: config.megagroup || false,
        }),
      ) as Api.Updates;

      // Find the channel in the updates
      const channel = result.chats[0];
      if (!channel || !("id" in channel)) {
        throw new Error("Failed to create channel");
      }

      const channelId = channel.id.toString();

      // Set username if provided
      if (config.address) {
        const updateUsernameResult = await this.client.invoke(
          new Api.channels.UpdateUsername({
            channel: await this.client.getInputEntity(channelId),
            username: config.address,
          }),
        );

        if (!updateUsernameResult) {
          console.warn("Failed to set channel username");
        }
      }

      return channelId;
    } catch (error) {
      console.error("Error creating channel:", error);
      throw error;
    }
  }

  async postToChannel(channelId: string, message: string): Promise<boolean> {
    try {
      const result = await this.client.sendMessage(channelId, { message });
      return !!result;
    } catch (error) {
      console.error("Error posting message:", error);
      throw error;
    }
  }

  async getChannelInfo(channelId: string) {
    try {
      const result = await this.client.invoke(
        new Api.channels.GetFullChannel({
          channel: await this.client.getInputEntity(channelId),
        }),
      );
      return result;
    } catch (error) {
      console.error("Error getting channel info:", error);
      throw error;
    }
  }

  async addBotToChannel(
    channelId: string,
    botUsername: string,
  ): Promise<boolean> {
    try {
      // First, get the bot's input user
      const bot = await this.client.getInputEntity(botUsername);
      const channel = await this.client.getInputEntity(channelId);

      // Make bot admin with rights
      await this.client.invoke(
        new Api.channels.EditAdmin({
          channel: channel,
          userId: bot,
          adminRights: new Api.ChatAdminRights({
            changeInfo: true,
            postMessages: true,
            editMessages: true,
            deleteMessages: true,
            banUsers: true,
            inviteUsers: true,
            pinMessages: true,
            addAdmins: false,
            anonymous: false,
            manageCall: false,
            other: true,
          }),
          rank: "Bot Admin",
        }),
      );

      return true;
    } catch (error) {
      console.error("Error adding bot to channel:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}

async function main() {
  const API_ID = parseInt(process.env.TELEGRAM_API_ID || "");
  const API_HASH = process.env.TELEGRAM_API_HASH || "";
  const PHONE_NUMBER = process.env.PHONE_NUMBER || "";
  const SAVED_SESSION = process.env.SAVED_SESSION || "";
  const BOT_USERNAME = process.env.BOT_USERNAME || "";

  if (!API_ID || !API_HASH || !PHONE_NUMBER) {
    throw new Error("Required environment variables are not defined");
  }

  const creator = new TelegramChannelCreator(API_ID, API_HASH, SAVED_SESSION);

  try {
    console.log("Initializing client...");
    const session = await creator.initialize(PHONE_NUMBER);
    console.log("Session string (save this for future use):", session);

    const channelConfig: ChannelCreationConfig = {
      title: "My Programmatic Channel",
      about: "This channel was created using GramJS",
      address: "my_program_channel",
      megagroup: false,
      broadcast: true,
    };

    console.log("Creating channel...");
    const channelId = await creator.createChannel(channelConfig);
    console.log("Channel created with ID:", channelId);

    console.log("Adding bot to channel...");
    await creator.addBotToChannel(channelId, BOT_USERNAME);
    console.log("Bot added successfully!");

    console.log("Posting initial message...");
    await creator.postToChannel(
      channelId,
      "Hello! This is the first message in our programmatically created channel! 🎉",
    );

    console.log("Getting channel info...");
    const channelInfo = await creator.getChannelInfo(channelId);
    console.log("Channel created successfully!");
    console.log("Channel info:", channelInfo);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await creator.disconnect();
  }
}

main();
