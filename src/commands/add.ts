import fs from 'fs'
import path from 'path'
import { format } from 'date-fns'
import Discord from 'discord.js'
import Server from '../models/Server'

import { api } from '../services/api'

const { images } = require("../../cache/imagesCache.json")

import Mustache from 'mustache'
import { Config } from '../bot'

function getLanguages() {
  const availableLanguages = fs.readdirSync(path.resolve(__dirname, '../../languages'))
    .map(language => language.replace(/.json$/, ''))
  
  const languages = availableLanguages.map(language => {
    const { addCommand } = require(`../../languages/${language}.json`)
    return {
      [language]: {
        name: addCommand.name,
        aliases: addCommand.aliases,
        description: addCommand.description,
        args: true,
        usage: addCommand.usage,
      }
    }
  })

  return languages
}

export = {
  languages: getLanguages(),
  async execute(message:Discord.Message, args:Array<string>, { language }: Config) {
    const { addCommand, common } = require(`../../languages/${language}.json`)
    const genresCache = require(`../../cache/genresCache_${language}.json`)

    const server = await Server.findOne({serverId: message.guild?.id})
    const searchTitle = args.join(" ")
    const commandMessage = message

    const maxInPage = 20
    let currentMediaIndex = 0
    let currentKnownForIndex = 0
    let currentQueryPage = 1

    async function getMediaData(currentQueryPage:number, selectedLanguage:string = language) {
      const { data } = await api.get('search/multi', {
        params: {
          language: selectedLanguage,
          query: searchTitle,
          page: currentQueryPage,
        }
      })

      return data
    }

    function sendCleanEmbed(cleanEmbed:Discord.MessageEmbed, message:Discord.Message, title:string, description:string) {
      cleanEmbed.fields = []
      cleanEmbed
        .setTitle(title)
        .setURL('')
        .setDescription(description)
        .setThumbnail('')
        .setFooter('')
      message.edit(cleanEmbed)
      message.reactions.removeAll()
    }

    async function sendMediaEmbed(previousMessage?:Discord.Message) {
      if (currentKnownForIndex > mediaData.results[currentMediaIndex]?.known_for?.length - 1 ) {
        ++currentMediaIndex
        currentKnownForIndex = 0
      }

      if (currentMediaIndex > maxInPage - 1 && mediaData.total_pages > currentQueryPage) {
        ++currentQueryPage
        currentMediaIndex = 0
        mediaData = await getMediaData(currentQueryPage)
      }

      const isPerson = (mediaData.results[currentMediaIndex].media_type == 'person')
      const media = isPerson
        ? mediaData.results[currentMediaIndex].known_for[currentKnownForIndex]
        : mediaData.results[currentMediaIndex]
      
      if (!!!media.overview) {
        const mediaDataInEnglish = await getMediaData(currentQueryPage, 'en-US')
        media.overview = isPerson
          ? mediaDataInEnglish.results[currentMediaIndex].known_for[currentKnownForIndex].overview
          : mediaDataInEnglish.results[currentMediaIndex].overview
      }

      const mediaType = media.media_type
      const isMovie = (mediaType == 'movie')

      const mediaOriginalTitle = isMovie ? media.original_title : media.original_name
      const mediaTitle = isMovie ? media.title : media.name
      
      const mediaEmbed = new Discord.MessageEmbed()
        .setTitle(
          (mediaTitle)
            ? (mediaTitle.toLowerCase() === mediaOriginalTitle.toLowerCase())
              ? mediaTitle
              : `${mediaTitle} *(${mediaOriginalTitle})*`
            : mediaOriginalTitle
        )
        .setURL(`https://www.themoviedb.org/${media.media_type}/${media.id}`)
        .setDescription(media.overview)
        .setThumbnail(`${images.secure_base_url}/${images.poster_sizes[4]}/${media.poster_path}`)
        .addFields(
          {name: '** **', value: '** **'},
          {name: '◀️', value: common.previousMedia, inline: true},
          {name: '▶️', value: common.nextMedia, inline: true},
          {name: '** **', value: '** **'},
          {name: '✅', value: common.add, inline: true},
          {name: '❌', value: common.cancel, inline: true},
          {name: '** **', value: '** **'},
        )
        .setFooter(
          `${Mustache.render(addCommand.footer.value, {
            currentQueryPage,
            mediaDataTotalPages: mediaData.total_pages,
            currentMediaIndex: currentMediaIndex + 1,
            mediaDataResultsLength: mediaData.results.length + 1,
          })}`
          +
          `${isPerson 
            ? Mustache.render(addCommand.footer.isPerson, {
                mediaDataName: mediaData.results[currentMediaIndex].name,
                currentKnownForIndex: currentKnownForIndex + 1,
                mediaDataLength: mediaData.results[currentMediaIndex].known_for.length,
              })
            : ''}`
        )

      const movieMessage = previousMessage ? previousMessage : await message.channel.send(mediaEmbed)
      if (previousMessage) {
        movieMessage.reactions.removeAll()
        movieMessage.edit(mediaEmbed)
      }

      if (currentMediaIndex > 0 || currentQueryPage > 1) {
        movieMessage.react('◀️')
      } 
      if (mediaData.total_results - 1 > (currentQueryPage - 1) * maxInPage + currentMediaIndex) {
        movieMessage.react('▶️')
      }
      movieMessage.react('✅')
      movieMessage.react('❌')

      const filter = (reaction: Discord.MessageReaction, user:Discord.User) => ['◀️', '▶️', '✅', '❌'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

      movieMessage.awaitReactions(filter, { max: 1, time: 60000 })
        .then(async collected => {
          const reaction = collected.first()
          
          if (reaction?.emoji.name === '✅') {
            for (const items of server.watchlist) {
              if (items.original_title === mediaOriginalTitle) {
                mediaEmbed.fields = []
                const formattedDate = format(new Date(items.addedAt), common.formatOfDate)
                mediaEmbed
                  .addFields(
                  {name: '** **', value: '** **'},
                  {name: addCommand.title, value: 
                    `${isMovie
                      ? addCommand.alreadyInWatchlist.isMovieTrue
                      : addCommand.alreadyInWatchlist.isMovieFalse}`
                    +
                    `${Mustache.render(addCommand.alreadyInWatchlist.value, {
                      itemsAddedBy: items.addedBy.id,
                      formattedDate,
                    })}`},
                )
                  .setFooter('')
                movieMessage.edit(mediaEmbed)
                movieMessage.reactions.removeAll()
                return
              }
            }
            
            const genreList = media.genre_ids.map((genreId:number) => {
              for (const genreType of genresCache.genres) {
                if (genreId == genreType.id) {
                  return genreType.name
                }
              }
            })

            const addedBy = {
              id: commandMessage.author.id,
              username: commandMessage.author.username,
              bot: commandMessage.author.bot,
              createdTimestamp: commandMessage.author.createdTimestamp,
              tag: commandMessage.author.tag,
              displayAvatarURL: commandMessage.author.displayAvatarURL()
            }

            const mediaObject = {
              id: media.id,
              title: mediaTitle,
              original_title: mediaOriginalTitle,
              genres: genreList,
              media_type: media.media_type,
              description: media.overview,
              poster_path: media.poster_path,
              addedAt: Date.now(),
              addedBy,
            }

            server.watchlist.push(mediaObject)
            await server.save()            

            mediaEmbed.fields = []
            mediaEmbed
              .addField(addCommand.title, addCommand.success)
              .setDescription('')
              .setFooter('')
            movieMessage.edit(mediaEmbed)
            movieMessage.reactions.removeAll()
          } else if (reaction?.emoji.name === '◀️') {
            if (isPerson) {
              --currentKnownForIndex
            } else {
              if (currentMediaIndex > 0 || currentQueryPage > 1) --currentMediaIndex
            }
            sendMediaEmbed(movieMessage)
          } else if (reaction?.emoji.name === '▶️') {
            if (isPerson) {
              ++currentKnownForIndex
            } else {
              if (mediaData.total_results - 1 > (currentQueryPage - 1) * maxInPage + currentMediaIndex) ++currentMediaIndex
            }
            sendMediaEmbed(movieMessage)
          } else {
            sendCleanEmbed(mediaEmbed, movieMessage, addCommand.title, addCommand.cancelled)
          }
        })
        .catch(error => {
          console.error(error)
          sendCleanEmbed(mediaEmbed, movieMessage, addCommand.title, addCommand.cancelled)
        })
    }

    let mediaData = await getMediaData(currentQueryPage)
    sendMediaEmbed()
  }
}