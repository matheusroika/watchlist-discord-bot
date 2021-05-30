import Discord from 'discord.js'
import { Document } from 'mongoose';

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

export interface CommandDetails {
  name: string;
  aliases: Array<string>;
  description: string;
  args?: boolean;
  usage?: string;
}

export interface Command extends CommandDetails {
  execute: (
    message: Discord.Message,
    commandArgs: string[],
    config: Config,
    commands?: Discord.Collection<string,
    Discord.Collection<string, Command>>
  ) => void;
}

export interface CommandsByLanguages {
  languages: CommandDetails[],
  execute: Pick<Command, 'execute'>
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

export interface WatchlistMedia {
  addedBy: {
    id: string;
    username: string;
    bot: boolean;
    createdTimestamp: number;
    tag: string;
    displayAvatarURL: string;
  };
  genres: Array<number>;
  id: Number;
  title: string;
  original_title: string;
  media_type: 'movie' | 'tv';
  description: string;
  poster_path: string;
  addedAt: number;
}

export interface Server extends Document {
  channelToListen: string | null;
  serverId: string;
  prefix: string;
  language: string;
  watchlist: WatchlistMedia[]
}