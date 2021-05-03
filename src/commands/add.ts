import fs from 'fs'
import path from 'path'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import Discord from 'discord.js'

import { api } from '../services/api'

const imagesCache = require("../services/images-cache.json")
const genresCache = require("../services/genres-cache.json")
const config = require("../config.json")
const watchList = require("../watch-list.json")

export = {
  name: 'add',
  description: 'Add new media to watch list',
  async execute(message:Discord.Message, args:Array<string>) {
    if (args.length == 0) {
      message.channel.send(`Para adicionar uma obra a watch list, digite ${config.commandPrefix}add \`nome do filme\`.`)
      return
    }

    const searchTitle = args.join(" ")
    const commandMessage = message

    const maxInPage = 20
    let currentMediaIndex = 0
    let currentKnownForIndex = 0
    let currentQueryPage = 1

    async function getMediaData(currentQueryPage:number) {
      const { data } = await api.get('search/multi', {
        params: {
          language: 'pt-BR',
          query: searchTitle,
          page: currentQueryPage,
        }
      })

      return data
    }

    function sendEndEmbed(message:Discord.Message) {
      const endEmbed = new Discord.MessageEmbed()
        .setTitle('Fim da pesquisa')
        .setDescription('Você chegou no último item da pesquisa')
        .addFields(
          {name: '\u200B', value: '\u200B'},
          {name: '🔁', value: 'Repetir pesquisa', inline: true},
          {name: '❌', value: 'Cancelar', inline: true},
        )

      message.reactions.removeAll()
      message.edit(endEmbed)
      message.react('🔁')
      message.react('❌')
        
      const filter = (reaction:Discord.MessageReaction, user:Discord.User) => ['🔁', '❌'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

      message.awaitReactions(filter, { max: 1, time: 60000 })
        .then(async collected => {
          const reaction = collected.first()

          if (reaction?.emoji.name === '🔁') {
            if (currentQueryPage > 1) {
              currentQueryPage = 1
              mediaData = await getMediaData(currentQueryPage)
            }

            currentMediaIndex = 0
            sendMediaEmbed(message)
          } else {
            sendCleanEmbed(endEmbed, message, 'Cancelado', 'Nenhum filme adicionado a watch list.')
          }
        })
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
      
      if ((currentQueryPage - 1) * maxInPage + currentMediaIndex > mediaData.total_results - 1) {
        sendEndEmbed(previousMessage as Discord.Message)
        return
      }

      const isPerson = (mediaData.results[currentMediaIndex].media_type == 'person')
      const media = isPerson ? mediaData.results[currentMediaIndex].known_for[currentKnownForIndex] : mediaData.results[currentMediaIndex]
     
      const mediaType = media.media_type
      const isMovie = (mediaType == 'movie')

      const mediaOriginalTitle = isMovie ? media.original_title : media.original_name
      const mediaTitle = isMovie ? media.title : media.name
      
      const mediaEmbed = new Discord.MessageEmbed()
        .setTitle(
          (mediaTitle)
            ? (mediaTitle == mediaOriginalTitle)
              ? mediaTitle
              : `${mediaTitle} *(${mediaOriginalTitle})*`
            : mediaOriginalTitle
        )
        .setURL(`https://www.themoviedb.org/${media.media_type}/${media.id}`)
        .setDescription(media.overview)
        .setThumbnail(`${imagesCache.images.secure_base_url}/${imagesCache.images.poster_sizes[4]}/${media.poster_path}`)
        .addFields(
          {name: '\u200B', value: '\u200B'},
          {name: '✅', value: 'Adicionar na\nwatch list', inline: true},
          {name: '▶️', value: 'Próxima obra\nda busca', inline: true},
          {name: '❌', value: 'Cancelar', inline: true},
          {name: '\u200B', value: '\u200B'},
        )
        .setFooter(`Página ${currentQueryPage}/${mediaData.total_pages} | Resultado ${currentMediaIndex + 1}/${mediaData.results.length}${(isPerson) ? ` | Obras famosas de ${mediaData.results[currentMediaIndex].name} ${currentKnownForIndex + 1}/${mediaData.results[currentMediaIndex].known_for.length}` : ''}`)

      const movieMessage = previousMessage ? previousMessage : await message.channel.send(mediaEmbed)
      if (previousMessage) {
        movieMessage.reactions.removeAll()
        movieMessage.edit(mediaEmbed)
      } 
      movieMessage.react('✅')
      movieMessage.react('▶️')
      movieMessage.react('❌')

      const filter = (reaction: Discord.MessageReaction, user:Discord.User) => ['✅', '▶️', '❌'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

      movieMessage.awaitReactions(filter, { max: 1, time: 60000 })
        .then(collected => {
          const reaction = collected.first()
          
          if (reaction?.emoji.name === '✅') {
            for (const items of watchList) {
              if (items.name === mediaOriginalTitle) {
                mediaEmbed.fields = []
                const formattedDate = format(new Date(items.addedAt), "dd/MM/yyyy 'às' HH:mm", {locale: ptBR})
                mediaEmbed.addFields(
                  {name: '\u200B', value: '\u200B'},
                  {name: 'Resultado', value: `${isMovie ? 'Esse filme' : 'Essa série'} já está na watch list do servidor.\nColocado por <@${items.addedBy.id}> em ${formattedDate}`},
                )
                mediaEmbed.setFooter('')
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

            const mediaObject = {
              id: media.id,
              title: mediaTitle,
              original_title: mediaOriginalTitle,
              genres: genreList,
              media_type: media.media_type,
              description: media.overview,
              poster_path: media.poster_path,
              addedAt: Date.now(),
              addedBy: commandMessage.author,
            }

            watchList.push(mediaObject)
            fs.writeFileSync(path.resolve(__dirname, '../watch-list.json'), JSON.stringify(watchList, null, 2))

            mediaEmbed.fields = []
            mediaEmbed.addField('Resultado', 'Sucesso')
            mediaEmbed.setFooter('')
            movieMessage.edit(mediaEmbed)
            movieMessage.reactions.removeAll()
          } else if (reaction?.emoji.name === '▶️') {
            if (isPerson) {
              ++currentKnownForIndex
            } else {
              ++currentMediaIndex
            }
            sendMediaEmbed(movieMessage)
          } else {
            sendCleanEmbed(mediaEmbed, movieMessage, 'Cancelado', 'Nenhuma obra adicionada a watch list.')
          }
        })
        .catch(error => {
          console.error(error)
          sendCleanEmbed(mediaEmbed, movieMessage, 'Cancelado por timeout', 'Você demorou demais. Nenhuma obra adicionada a watch list.')
        })
    }

    let mediaData = await getMediaData(currentQueryPage)
    sendMediaEmbed()
  }
}