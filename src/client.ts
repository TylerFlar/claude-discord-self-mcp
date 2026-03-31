import { Client } from "discord.js-selfbot-v13";

let clientPromise: Promise<Client> | null = null;

export function getClient(): Promise<Client> {
  if (clientPromise) return clientPromise;

  clientPromise = new Promise<Client>((resolve, reject) => {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      reject(new Error("DISCORD_TOKEN environment variable is required"));
      clientPromise = null;
      return;
    }

    const client = new Client({
      checkUpdate: false,
    } as any);

    client.once("ready", () => {
      resolve(client);
    });

    client.once("error", (err) => {
      clientPromise = null;
      reject(err);
    });

    client.login(token).catch((err) => {
      clientPromise = null;
      reject(err);
    });
  });

  return clientPromise;
}
