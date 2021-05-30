import Discord from 'discord.js'

import Server from '../models/Server'

import { Config, GenresCache, LanguageFile, Server as TypeServer, WatchlistMedia } from '../types/bot'
const { images } = require("../../cache/imagesCache.json")

import Mustache from 'mustache'
import getLanguages from '../utils/getLanguages'

export = {
  languages: getLanguages('randomCommand', false, true),
  async execute(message: Discord.Message, args: Array<string>, { prefix, language }: Config) {
    const { randomCommand, common }: LanguageFile = require(`../../languages/${language}.json`)
    const genresCache: GenresCache = require(`../../cache/genresCache_${language}`)
    
    const { watchlist }: TypeServer = await Server.findOne({serverId: message.guild?.id}, 'watchlist')
    const commandMessage = message
    const argsList = args.join(' ').split('+')

    if(!watchlist.length) {
      const errorEmbed = new Discord.MessageEmbed()
        .setTitle(randomCommand.title)
        .setDescription(Mustache.render(randomCommand.emptyError, [prefix]))
      return message.channel.send(errorEmbed)
    }

    async function sendMediaEmbed(previousMessage?: Discord.Message) {
      function getRandomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min)) + min;
      }

      function normalizeString(string:string) {
        return string.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
      }

      function getAvailableGenres() {
        const availableGenres: Array<string> = []

        watchlist.forEach(media => {
          media.genres.forEach(genre => {
            const cachedGenre = genresCache.genres.find(cachedGenre => cachedGenre.id === Number(genre))
            if (cachedGenre) {
              availableGenres.push(cachedGenre.name)
            }  
          })
        })

        return availableGenres
      }

      function getMediaGenres(media: WatchlistMedia) {
        const mediaGenres: Array<string> = []

        media.genres.forEach(genre => {
          const cachedGenre = genresCache.genres.find(cachedGenre => cachedGenre.id === Number(genre))
          if (cachedGenre) {
            mediaGenres.push(cachedGenre.name)
          }  
        })

        return mediaGenres
      }

      const randomIndex = getRandomInt(0, watchlist.length)
      const media = watchlist[randomIndex]

      if (args.length) {
        const argsGenres = argsList.map(genre => normalizeString(genre))
        const availableGenres = getAvailableGenres().map(genre => normalizeString(genre))
        const mediaGenres = getMediaGenres(media).map(genre => normalizeString(genre))
        
        if (!availableGenres.some(genre => argsGenres.includes(genre))) {
          message.channel.send(randomCommand.genreNotFound)
          return
        }

        if (!mediaGenres.some(genre => argsGenres.includes(genre))) {
          if (previousMessage) {
            sendMediaEmbed(previousMessage)
          } else {
            sendMediaEmbed()
          }

          return
        }
      }

      const movieEmbed = new Discord.MessageEmbed()
        .setTitle(
          (media.title)
            ? (media.title.toLowerCase() === media.original_title.toLowerCase())
              ? media.title
              : `${media.title} *(${media.original_title})*`
            : media.original_title
        )
        .setURL(`https://www.themoviedb.org/${media.media_type}/${media.id}`)
        .setDescription(media.description)
        .setThumbnail(`${images.secure_base_url}/${images.poster_sizes[4]}/${media.poster_path}`)
        .addFields(
          {name: '** **', value: '** **'},
          {name: '✅', value: common.confirm, inline: true},
          {name: '🔁', value: randomCommand.drawAgain, inline: true},
          {name: '❌', value: common.cancel, inline: true},
        )

        const movieMessage = previousMessage ? previousMessage : await message.channel.send(movieEmbed)
        if (previousMessage) {
          movieMessage.reactions.removeAll()
          movieMessage.edit(movieEmbed)
        } 
        movieMessage.react('✅')
        movieMessage.react('🔁')
        movieMessage.react('❌')

        const filter = (reaction: Discord.MessageReaction, user: Discord.User) => ['✅', '❌', '🔁'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

        movieMessage.awaitReactions(filter, { max: 1, time: 60000 })
          .then(async collected => {
            const reaction = collected.first()

            if (reaction?.emoji.name === '✅') {
              movieEmbed.fields = []
              movieEmbed
                .setDescription('')
                .addField(randomCommand.title, randomCommand.success)
              movieMessage.edit(movieEmbed)
              movieMessage.reactions.removeAll()
              return
            } else if (reaction?.emoji.name === '❌') {
              movieEmbed.fields = []
              movieEmbed
                .setTitle(randomCommand.title)
                .setDescription(randomCommand.cancelled)
                .setURL('')
                .setThumbnail('')
              movieMessage.edit(movieEmbed)
              movieMessage.reactions.removeAll()
            } else {
              sendMediaEmbed(movieMessage)
            }
          })
          .catch(error => {
            console.error(error)
            movieEmbed.fields = []
            movieMessage.edit(movieEmbed)
            movieMessage.reactions.removeAll()
          })
    }

    sendMediaEmbed()
  }
}