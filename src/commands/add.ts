import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import Discord from 'discord.js'
import Server from '../model/Server'

import { api } from '../services/api'

const { images } = require("../../cache/imagesCache.json")
const genresCache = require("../../cache/genresCache.json")

export = {
  name: 'add',
  aliases: ['new', 'adicionar', 'novo'],
  description: 'Adiciona nova obra na watch list',
  args: true,
  usage: '<nome da obra>',
  async execute(message:Discord.Message, args:Array<string>) {
    const server = await Server.findOne({serverId: message.guild?.id})
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
      const media = isPerson ? mediaData.results[currentMediaIndex].known_for[currentKnownForIndex] : mediaData.results[currentMediaIndex]
     
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
          {name: '◀️', value: 'Obra anterior', inline: true},
          {name: '▶️', value: 'Próxima obra', inline: true},
          {name: '** **', value: '** **'},
          {name: '✅', value: 'Adicionar', inline: true},
          {name: '❌', value: 'Cancelar', inline: true},
          {name: '** **', value: '** **'},
        )
        .setFooter(`Página ${currentQueryPage}/${mediaData.total_pages} | Resultado ${currentMediaIndex + 1}/${mediaData.results.length}${(isPerson) ? ` | Obras famosas de ${mediaData.results[currentMediaIndex].name} ${currentKnownForIndex + 1}/${mediaData.results[currentMediaIndex].known_for.length}` : ''}`)

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
                const formattedDate = format(new Date(items.addedAt), "dd/MM/yyyy 'às' HH:mm", {locale: ptBR})
                mediaEmbed.addFields(
                  {name: '** **', value: '** **'},
                  {name: 'Adicionar na watch list', value: `${isMovie ? 'Esse filme' : 'Essa série'} já está na watch list do servidor.\nColocado por <@${items.addedBy.id}> em ${formattedDate}`},
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
            mediaEmbed.addField('Adicionar na watch list', 'Obra adicionada com sucesso')
            mediaEmbed.setDescription('')
            mediaEmbed.setFooter('')
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
            sendCleanEmbed(mediaEmbed, movieMessage, 'Adicionar na watch list', 'Nenhuma obra adicionada a watch list.')
          }
        })
        .catch(error => {
          console.error(error)
          sendCleanEmbed(mediaEmbed, movieMessage, 'Adicionar na watch list', 'Nenhuma obra adicionada a watch list.')
        })
    }

    let mediaData = await getMediaData(currentQueryPage)
    sendMediaEmbed()
  }
}