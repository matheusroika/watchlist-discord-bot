import Discord from 'discord.js'
import { Document } from 'mongoose';

export interface Config {
  serverId: string;
  prefix: string;
  channelToListen: string | null;
  language: string;
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

export interface TMDBSearchResult {
  page: number;
  results: Media[];
  total_results: number;
  total_pages: number;
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
  genres: Array<string>;
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

export interface Genre {
  id: number;
  name: string;
}

export interface GenresCache {
  genres: Genre[];
}

export interface ImagesCache {
  images: {
    base_url: string;
    secure_base_url: string;
    backdrop_sizes: Array<string>;
    logo_sizes: Array<string>;
    poster_sizes: Array<string>;
    profile_sizes: Array<string>;
    still_sizes: Array<string>;
  };
  change_keys: Array<string>;
}

export interface LanguageFile {
  common: {
    add: string;
    cancel: string;
    confirm: string;
    formatOfDate: string;
    movie: string;
    tv: string;
    previousMedia: string;
    nextMedia: string;
    previousPage: string;
    nextPage: string;
  },
  bot: {
    commandArgs: string;
    commandArgsUsage: string;
  },
  addCommand: {
    name: string;
    aliases: Array<string>;
    description: string;
    usage: string;
    title: string;
    footer: {
      value: string;
      isPerson: string;
    };
    alreadyInWatchlist: {
      isMovieTrue: string;
      isMovieFalse: string;
      value: string;
    };
    success: string;
    cancelled: string;
  };
  listenedMessage: {
    title: string;
    foundSimilar: {
      description: string;
      searched: string;
      found: string;
      wishToAdd: string;
    };
    cancelled: string;
    notFound: string;
  };
  channelCommand: {
    name: string;
    aliases: Array<string>;
    description: string;
    usage: string;
    onlyOne: string;
    monitoringInstructions: string;
    stopMonitoring: string;
    tagChannel: string;
    alreadyMonitoring: string;
    success: string;
  },
  helpCommand: {
    name: string;
    aliases: Array<string>;
    description: string;
    usage: string;
    title: string;
    argsLegend: string;
    translations: {
      description: string;
      aliases: string;
      usage: string;
    },
    pagination: string;
    cancelled: string;
    notFound: string;
  },
  languageCommand: {
    name: string;
    aliases: Array<string>;
    description: string;
    usage: string;
    onlyOne: string;
    languagesAvailable: string;
    success: string;
  },
  listCommand: {
    name: string;
    aliases: Array<string>;
    description: string;
    title: string;
    presentation: string;
    emptyError: string;
    pagination: string;
    cancelled: string;
  },
  prefixCommand: {
    name: string;
    aliases: Array<string>;
    description: string;
    usage: string;
    onlyOne: string;
    success: string;
  },
  randomCommand: {
    name: string;
    aliases: Array<string>;
    description: string;
    usage: string;
    title: string;
    emptyError: string;
    genreNotFound: string;
    drawAgain: string;
    success: string;
    cancelled: string;
  },
  removeCommand: {
    name: string;
    aliases: Array<string>;
    description: string;
    usage: string;
    title: string;
    emptyError: string;
    notFound: string;
    pagination: string;
    success: string;
    cancelled: string;
  }
}