import Discord from 'discord.js'

export interface Config {
  serverId: string;
  prefix: string;
  channelToListen: string | null;
  language: string;
}

export interface Language {
  name: string;
  aliases: Array<string>;
  description: string;
  args?: boolean;
  usage?: string;
}

export interface Command {
  name: string;
  aliases: Array<string>;
  description: string;
  args?: boolean;
  usage?: string;
  execute: (
    message: Discord.Message,
    commandArgs: string[],
    config: Config,
    commands?: Discord.Collection<string,
    Discord.Collection<string, Command>>
  ) => void;
}