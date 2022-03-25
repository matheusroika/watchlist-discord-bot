import Discord from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders';
import { Document } from 'mongoose';

export interface Config {
  serverId: string;
  channelToListen: string | null;
  language: string;
}


export interface Command {
  data: SlashCommandBuilder;
  execute: (
    interaction: Discord.Interaction,
    config: Config
  ) => Promise<void>;
}

export interface LanguageData {
  [language: string]: {
    data: SlashCommandBuilder
  }
}

export interface CommandByLanguages {
  getCommand: () => Array<LanguageData>,
  execute: (
    interaction: Discord.Interaction,
    config: Config
  ) => Promise<void>;
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
  known_for?: Array<Media>;
  known_for_department?: string;
}

export interface TMDBSearchResult {
  page: number;
  results: Array<Media>;
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

export interface WatchedMedia extends WatchlistMedia {
  watchedBy: {
    id: string;
    username: string;
    bot: boolean;
    createdTimestamp: number;
    tag: string;
    displayAvatarURL: string;
  };
  watchedAt: number;
}

export interface Server extends Document {
  channelToListen: string | null;
  serverId: string;
  language: string;
  watchlist: Array<WatchlistMedia>
  watched: Array<WatchedMedia>
}

export interface Genre {
  id: number;
  name: string;
}

export interface GenresCache {
  genres: Array<Genre>;
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
  languageName: string;
  common: {
    add: string;
    cancel: string;
    confirm: string;
    movie: string;
    tv: string;
    previousMedia: string;
    nextMedia: string;
    previousPage: string;
    nextPage: string;
  },
  listenedMessage: {
    title: string;
    foundSimilar: {
      description: string;
      searched: string;
      found: string;
      wishToAdd: string;
    }
    cancelled: string;
    notFound: string;
  },
  commands: {
    add: {
      name: string;
      description: string;
      longDescription: string;
      subcommands: {
        movie: {
          name: string;
          search: string;
          description: string;
          optionName: string;
          optionDescription: string;
        }
        tv: {
          name: string;
          search: string;
          description: string;
          optionName: string;
          optionDescription: string;
        }
        person: {
          name: string;
          search: string;
          description: string;
          optionName: string;
          optionDescription: string;
        }
      }
      optionName: string;
      optionDescription: string;
      title: string;
      footer: {
        value: string;
        isPerson: string;
      }
      alreadyInWatchlist: string;
      alreadyInWatched: string;
      knownForDescription: string;
      selectMedia: string;
      selectPerson: string;
      success: string;
      successEphemeral: string;
      cancelled: string;
      isMovieTrue: string;
      isMovieFalse: string;
    },
    channel: {
      name: string;
      description: string;
      longDescription: string;
      optionName: string;
      optionDescription: string;
      removeOptionName: string;
      removeOptionDescription: string;
      removeOptionChoice: string;
      monitoringInstructions: string;
      currentMonitoring: string;
      textChannel: string;
      alreadyMonitoring: string;
      success: string;
      removeSuccess: string;
    },
    help: {
      name: string;
      description: string;
      longDescription: string;
      title: string;
    },
    language: {
      name: string;
      description: string;
      longDescription: string;
      optionName: string;
      optionDescription: string;
      success: string;
    },
    list: {
      name: string;
      description: string;
      longDescription: string;
      title: string;
      presentation: string;
      emptyError: string;
      pagination: string;
      cancelled: string;
    },
    random: {
      name: string;
      description: string;
      longDescription: string;
      optionName: string;
      optionDescription: string;
      title: string;
      emptyError: string;
      genreNotFound: string;
      drawAgain: string;
      success: string;
      successEphemeral: string;
      cancelled: string;
    },
    remove: {
      name: string;
      description: string;
      longDescription: string;
      optionName: string;
      optionDescription: string;
      title: string;
      emptyError: string;
      notFound: string;
      pagination: string;
      success: string;
      successEphemeral: string;
      cancelled: string;
    },
    watched: {
      name: string;
      description: string;
      longDescription: string;
      optionName: string;
      optionDescription: string;
      title: string;
      emptyError: string;
      notFound: string;
      pagination: string;
      success: string;
      successEphemeral: string;
      cancelled: string;
    },
    watchedlist: {
      name: string;
      description: string;
      longDescription: string;
      title: string;
      presentation: string;
      emptyError: string;
      pagination: string;
      cancelled: string;
    }
  }
}