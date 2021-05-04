import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

const { prefix } = require("../config.json")
const { images } = require("../services/images-cache.json")
const watchList = require("../watch-list.json")

export = {
  name: 'remove',
  aliases: ['delete', 'remover', 'deletar'],
  description: 'Remove uma obra da watch list',
  args: true,
  usage: '<nome da obra>',
  async execute(message:Discord.Message, args:Array<string>) {
    const commandMessage = message
    const titleToRemove = normalizeString(args.join(" "))
    let removeIndex = 0
    const removeList:any = []
    const removeEmbed = new Discord.MessageEmbed()

    if(!watchList.length) {
      removeEmbed
        .setTitle('Remoção de obras da watch list')
        .setDescription(`A watch list está vazia! Digite \`${prefix}add <nome da obra>\` para adicionar uma obra!`)
      return message.channel.send(removeEmbed)
    }

    function normalizeString(string:string) {
      return string.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
    }

    for (const media of watchList) {
      const normalizedTitle = normalizeString(media.title)
      const normalizedOriginalTitle = normalizeString(media.original_title)

      if (normalizedTitle.includes(titleToRemove) || normalizedOriginalTitle.includes(titleToRemove)) {
        removeList.push(media)
      }
    }

    if (removeList.length === 0) {
      removeEmbed
        .setTitle('Remoção de obras da watch list')
        .setDescription('Nenhuma obra com esse nome foi encontrada na watch list.')
      return message.channel.send(removeEmbed)
    } else {
      sendRemoveEmbed()
    }

    async function sendRemoveEmbed(previousMessage?:Discord.Message) {
      const removeMedia = removeList[removeIndex]
      removeEmbed.fields = []
      removeEmbed
        .setTitle(
          (removeMedia.title)
            ? (removeMedia.title.toLowerCase() === removeMedia.original_title.toLowerCase())
              ? removeMedia.title
              : `${removeMedia.title} *(${removeMedia.original_title})*`
            : removeMedia.original_title
        )
        .setURL(`https://www.themoviedb.org/${removeMedia.media_type}/${removeMedia.id}`)
        .setDescription(removeMedia.description)
        .setThumbnail(`${images.secure_base_url}/${images.poster_sizes[4]}/${removeMedia.poster_path}`)
        .addFields(
          {name: '** **', value: '** **'},
          {name: '◀️', value: 'Obra anterior', inline: true},
          {name: '▶️', value: 'Próxima obra', inline: true},
          {name: '** **', value: '** **'},
          {name: '✅', value: 'Adicionar', inline: true},
          {name: '❌', value: 'Cancelar', inline: true},
          {name: '** **', value: '** **'},
        )
        .setFooter(`Resultado ${removeIndex + 1}/${removeList.length}`)
      
      const removeMessage = (previousMessage) ? previousMessage : await message.channel.send(removeEmbed)
      if (previousMessage) {
        removeMessage.reactions.removeAll()
        removeMessage.edit(removeEmbed)
      }

      if (removeIndex > 0) removeMessage.react('◀️') 
      if (removeIndex < removeList.length - 1) removeMessage.react('▶️')
      removeMessage.react('✅')
      removeMessage.react('❌')

      const filter = (reaction:Discord.MessageReaction, user:Discord.User) => ['◀️', '▶️', '❌', '✅'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

      removeMessage.awaitReactions(filter, { max: 1, time: 60000 })
        .then(collected => {
          const reaction = collected.first()

          if (reaction?.emoji.name === '◀️') {
            if (removeIndex > 0) --removeIndex
            sendRemoveEmbed(removeMessage)
          } else if (reaction?.emoji.name === '▶️') {
            if (removeIndex < removeList.length - 1) ++removeIndex
            sendRemoveEmbed(removeMessage)
          } else if (reaction?.emoji.name === '✅') {
            removeEmbed.fields = []
            removeEmbed
              .setDescription('')
              .setFooter('')
              .addField('Resultado', 'Obra removida com sucesso')
            const newWatchList = watchList.filter((media:any) => media !== removeMedia)
            fs.writeFileSync(path.resolve(__dirname, '../watch-list.json'), JSON.stringify(newWatchList, null, 2))

            removeMessage.reactions.removeAll()
            removeMessage.edit(removeEmbed)
          } else {
            removeEmbed.fields = []
            removeEmbed
              .setTitle('Remoção de obras da watch list')
              .setDescription('A remoção de obras da watch list foi encerrada. Nenhuma obra foi removida. ')
              .setURL('')
              .setThumbnail('')
              .setFooter('')
            removeMessage.reactions.removeAll()
            removeMessage.edit(removeEmbed)
          }
        })
        .catch(error => {
          console.error(error)
          removeEmbed.fields = []
          removeEmbed
            .setTitle('Remoção de obras da watch list')
            .setDescription('Nenhuma obra foi removida. A remoção de obras da watch list foi encerrada.')
            .setURL('')
            .setThumbnail('')
            .setFooter('')
          removeMessage.reactions.removeAll()
          removeMessage.edit(removeEmbed)
        })
    }
  }
}
