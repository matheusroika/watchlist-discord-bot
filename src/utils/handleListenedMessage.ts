import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

import { api } from '../services/api'

const genresCache = require("../services/genres-cache.json")
const config = require("../config.json")
const watchList = require("../watch-list.json")

export default async function handleListenedMessage(message:Discord.Message) {
  const commandMessage = message

  async function getMedia(title:string) {
    const { data } = await api.get('search/multi', {
      params: {
        language: 'pt-BR',
        query: title,
      }
    })

    const filteredMedia = data.results.length ? filterMedia(data.results) : undefined

    return filteredMedia ? filteredMedia[0] : filteredMedia
  }

  function filterMedia(media:any) {
    return media.filter((currentMedia:any) => (currentMedia.release_date || currentMedia.first_air_date) ? true : false)
  }

  if (message.embeds.length > 0 && (message.content.includes('letterboxd') || message.content.includes('themoviedb') || message.content.includes('imdb'))) {
    const searchTitle = (message.content.includes('letterboxd'))
      ? message.embeds[0].title?.replace(/ \(.*\)$/, '')
      : (message.content.includes('themoviedb'))
        ? message.embeds[0].title
        :  message.embeds[0].title?.replace(/ \(.*\) - IMDb$/, '')
    const mediaItem = await getMedia(searchTitle as string)
    const mediaEmbed = new Discord.MessageEmbed()

    if (!mediaItem) {
      mediaEmbed
          .setTitle('Erro')
          .setDescription('Não encontramos nenhuma obra com base nesse link.')
      message.channel.send(mediaEmbed)

      return
    }

    const mediaType = mediaItem.media_type
    const isMovie = (mediaType == 'movie')
    const isPerson = (mediaType == 'person')
    const media = isPerson ? mediaItem.known_for[0] : mediaItem
    const mediaOriginalTitle = isMovie ? media.original_title : media.original_name
    const mediaTitle = isMovie ? media.title : media.name
    
    for (const items of watchList) {
      if (items.original_title === mediaOriginalTitle) {
        const formattedDate = format(new Date(items.addedAt), "dd/MM/yyyy 'às' HH:mm", {locale: ptBR})

        mediaEmbed
          .setTitle('Erro')
          .setDescription(`${isMovie ? 'Esse filme' : 'Essa série'} já está na watch list do servidor.\nColocado por <@${items.addedBy.id}> em ${formattedDate}`)
        message.channel.send(mediaEmbed)
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

    if (searchTitle === mediaOriginalTitle) {
      watchList.push(mediaObject)
      fs.writeFileSync(path.resolve(__dirname, '../watch-list.json'), JSON.stringify(watchList, null, 2))
      
      mediaEmbed
        .setTitle('Sucesso')
        .setDescription(`${isMovie ? 'O filme' : 'A série'} ${message.embeds[0].title} foi adicionad${isMovie ? 'o' : 'a'} a watch list com sucesso.`)
      message.channel.send(mediaEmbed)
    } else {
      mediaEmbed
        .setTitle('Aviso')
        .setDescription(`Encontramos ${isMovie ? 'um filme' : 'uma série'} com o nome parecido, mas não exato`)
        .addFields(
          {name: 'Nome buscado', value: searchTitle, inline: true},
          {name: 'Nome encontrado', value: `${(mediaOriginalTitle === mediaTitle) ? mediaOriginalTitle : `${mediaOriginalTitle} *(${mediaTitle})*`}`, inline: true},
          {name: '\u200B', value: `**Deseja adicionar ${isMovie ? 'o filme' : 'a série'} encontrad${isMovie ? 'o' : 'a'}?**`},
        )
      message.channel.send(mediaEmbed)
          .then(message => {
            message.react('✅')
            message.react('❌')

            const filter = (reaction:Discord.MessageReaction, user:Discord.User) => ['✅', '❌'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

            message.awaitReactions(filter, { max: 1, time: 60000 })
              .then(collected => {
                const reaction = collected.first()

                if (reaction?.emoji.name === '✅') {
                  watchList.push(mediaObject)
                  fs.writeFileSync(path.resolve(__dirname, '../watch-list.json'), JSON.stringify(watchList, null, 2))
                  
                  mediaEmbed.fields = []
                  mediaEmbed
                    .setTitle('Sucesso')
                    .setDescription(`O filme ${(searchTitle === mediaTitle) ? searchTitle : `${searchTitle} *(${mediaTitle})*`} foi adicionado a watch list com sucesso.`)
                  message.reactions.removeAll()
                  message.edit(mediaEmbed)
                } else {
                  mediaEmbed.fields = []
                  mediaEmbed
                    .setTitle('Erro')
                    .setDescription(`Não adicionamos nenhuma obra na watch list. Tente procurar usando\n${config.commandPrefix}add \`nome da obra\``)
                  message.reactions.removeAll()
                  message.edit(mediaEmbed)
                }
              })
          })
    }
  }
}