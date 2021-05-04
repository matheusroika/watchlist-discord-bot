import Discord from "discord.js"

const { prefix } = require("../config.json")
const watchList = require("../watch-list.json")

export = {
  name: 'list',
  aliases: ['watchlist', 'lista'],
  description: 'Lista todas as obras da watch list',
  async execute(message:Discord.Message, args:Array<string>) {
    const commandMessage = message
    const maxInPage = 10
    let currentPage = 1
    const numberOfPages = Math.ceil(watchList.length/maxInPage)

    const listEmbed = new Discord.MessageEmbed()
      .setTitle('Watch list')
      .setDescription('Essas são as obras atualmente na watch list')
      .addField('** **', '** **')
    
    if(!watchList.length) {
      listEmbed.fields = []
      listEmbed.setDescription(`A watch list está vazia! Digite \`${prefix}add <nome da obra>\` para adicionar uma obra!`)
      return message.channel.send(listEmbed)
    }
      
     
    function addFields(startingIndex:number, finishingIndex:number) {
      let addFieldCount = 0
      for (let i = startingIndex; i < finishingIndex; i++) {
        listEmbed.addField(watchList[i].original_title,
          (watchList[i].title)
            ? (watchList[i].title.toLowerCase() === watchList[i].original_title.toLowerCase())
              ? '** **' : `*${watchList[i].title}*`
            : '** **',
          true)

        ++addFieldCount
        if (addFieldCount === 2 && i < finishingIndex - addFieldCount) {
          listEmbed.addField('** **', '** **')
          addFieldCount = 0
        }
      }
    }

    async function sendListEmbed(previousMessage?:Discord.Message) {
      const startingIndex = (currentPage - 1) * maxInPage
      const finishingIndex = (watchList.length - (maxInPage * (currentPage - 1)) > maxInPage) ? currentPage * maxInPage : watchList.length

      listEmbed.fields = []
      listEmbed.addField('** **', '** **')

      addFields(startingIndex, finishingIndex)

      listEmbed
        .addFields(
          {name: '** **', value: '** **'},
          {name: '◀️', value: 'Página\nanterior', inline: true},
          {name: '▶️', value: 'Próxima\npágina', inline: true},
          {name: '❌', value: 'Cancelar', inline: true},
          {name: '** **', value: '** **'},
        )
        .setFooter(`Página ${currentPage}/${numberOfPages}`)

      const listMessage = previousMessage ? previousMessage : await message.channel.send(listEmbed)
      if (previousMessage) {
        listMessage.reactions.removeAll()
        listMessage.edit(listEmbed)
      }

      if (numberOfPages > 1 && currentPage > 1) {
        listMessage.react('◀️')
      } 
      if (numberOfPages > 1 && currentPage < numberOfPages) {
        listMessage.react('▶️')
      }
      listMessage.react('❌')

      const filter = (reaction:Discord.MessageReaction, user:Discord.User) => ['◀️', '▶️', '❌'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

      listMessage.awaitReactions(filter, { max: 1, time: 60000 })
        .then(collected => {
          const reaction = collected.first()

          if (reaction?.emoji.name === '◀️') {
            if (numberOfPages > 1 && currentPage > 1) --currentPage
            sendListEmbed(listMessage)
          } else if (reaction?.emoji.name === '▶️') {
            if (numberOfPages > 1 && currentPage < numberOfPages) ++currentPage
            sendListEmbed(listMessage)
          } else {
            listEmbed.fields = []
            listEmbed
              .setDescription('A visualização da watch list foi encerrada.')
              .setFooter('')
            listMessage.reactions.removeAll()
            listMessage.edit(listEmbed)
          }
        })
        .catch(error => {
          console.error(error)
          listEmbed.fields = []
          listEmbed
            .setDescription('A visualização da watch list foi encerrada.')
            .setFooter('')
          listMessage.reactions.removeAll()
          listMessage.edit(listEmbed)
        })
    }

    sendListEmbed()
  }
}