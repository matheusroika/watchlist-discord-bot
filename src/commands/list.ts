import Discord from "discord.js"

const watchList = require("../watch-list.json")

export = {
  name: 'list',
  description: 'List all media on watch list!',
  async execute(message:Discord.Message, args:Array<string>) {
    const commandMessage = message
    const maxInPage = 12
    let currentPage = 1
    const numberOfPages = Math.ceil(watchList.length/maxInPage)

    const listEmbed = new Discord.MessageEmbed()
      .setTitle('Watch list')
      .setDescription('Essas são as obras atualmente na watch list')
      .addField('** **', '** **')
      
     
    function addFields(startingIndex:number, finishingIndex:number) {
      let addFieldCount = 0
      for (let i = startingIndex; i < finishingIndex; i++) {
        listEmbed.addField(watchList[i].original_title, (watchList[i].title === watchList[i].original_title) ? '** **' : `*${watchList[i].title}*`, true)
        ++addFieldCount
        
        if (addFieldCount === 1) {
          listEmbed.addField('\u200b', '\u200b', true)
        }
        if (addFieldCount === 2 && i < finishingIndex - addFieldCount) {
          listEmbed.addField('** **', '** **')
          addFieldCount = 0
        }
      }
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
            currentPage = 1
            sendListEmbed(message)
          } else {
            endEmbed.fields = []
            endEmbed
              .setTitle('Watch list')
              .setDescription('A visualização da watch list foi encerrada.')
            message.edit(endEmbed)
          }
        })
    }

    async function sendListEmbed(previousMessage?:Discord.Message) {
      if ((currentPage - 1) * maxInPage > watchList.length) {
        sendEndEmbed(previousMessage as Discord.Message)
        return
      }

      const startingIndex = (currentPage - 1) * maxInPage
      const finishingIndex = (watchList.length - (maxInPage * (currentPage - 1)) > maxInPage) ? currentPage * maxInPage : watchList.length
      
      addFields(startingIndex, finishingIndex)

      const listMessage = previousMessage ? previousMessage : await message.channel.send(listEmbed)
      if (previousMessage) {
        listMessage.reactions.removeAll()
        listMessage.edit(listEmbed)
      }

      if (numberOfPages > 1 && currentPage > 1) {
        listMessage.react('◀️')
      } else if (numberOfPages > 1) {
        listMessage.react('▶️')
      }
      listMessage.react('❌')

      const filter = (reaction:Discord.MessageReaction, user:Discord.User) => ['◀️', '▶️', '❌'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

      listMessage.awaitReactions(filter, { max: 1, time: 60000 })
        .then(collected => {
          const reaction = collected.first()

          if (reaction?.emoji.name === '◀️') {
            --currentPage
            listEmbed.fields = []
            listEmbed.addField('** **', '** **')
            sendListEmbed(listMessage)
          } else if (reaction?.emoji.name === '▶️') {
            ++currentPage
            listEmbed.fields = []
            listEmbed.addField('** **', '** **')
            sendListEmbed(listMessage)
          } else {
            listEmbed.fields = []
            listEmbed.setDescription('A visualização da watch list foi encerrada.')
            listMessage.reactions.removeAll()
            listMessage.edit(listEmbed)
          }
        })
        .catch(error => {
          console.error(error)
          listEmbed.fields = []
          listEmbed.setDescription('A visualização da watch list foi encerrada.')
          listMessage.reactions.removeAll()
          listMessage.edit(listEmbed)
        })
    }

    sendListEmbed()
  }
}