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

export interface Media {
  id?: number;
  genre_ids: Array<number>;
  poster_path?: string | null;
  original_title?: string;
  original_name?: string;
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv' | 'person';
  known_for?: Media[];
}