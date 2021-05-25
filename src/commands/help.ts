import Discord from 'discord.js'

import { Config } from '../bot'

export = {
  name: 'help',
  aliases: ['commands', 'ajuda', 'comandos'],
  description: 'Lista todos os comandos ou mostra informações sobre um comando.',
  usage: '[nome do comando]',
  async execute(message:Discord.Message, args:Array<string>, commands:any, { prefix }:Config) {
    if (!args.length) {
      const commandMessage = message
      const maxInPage = 4
      let currentPage = 1
      const numberOfPages = Math.ceil(commands.size/maxInPage)

      const helpEmbed = new Discord.MessageEmbed()
        .setTitle('Comandos')
        .setDescription(`Argumentos obrigatórios = \`<argumento>\` | opcionais = \`[argumento]\``)
      
      function addFields(startingIndex:number, finishingIndex:number) {
        const commandsArray:any = Array.from(commands.values())
        for (let i = startingIndex; i < finishingIndex; i++) {
          helpEmbed
            .addField('** **', '** **')
            .addField(commandsArray[i].name, '** **')
            .addField('Descrição', commandsArray[i].description, true)
            commandsArray[i].aliases && helpEmbed.addField('Apelidos', commandsArray[i].aliases.join(', '), true)
            helpEmbed.addField('Uso', `${prefix}${commandsArray[i].name}${(commandsArray[i].usage) ? ` \`${commandsArray[i].usage}\`` : ''}`, true)
        }
      }

      async function sendHelpEmbed(previousMessage?:Discord.Message) {
        const startingIndex = (currentPage - 1) * maxInPage
        const finishingIndex = (commands.size - (maxInPage * (currentPage - 1)) > maxInPage) ? currentPage * maxInPage : commands.size
        
        addFields(startingIndex, finishingIndex)

        helpEmbed
          .addFields(
            {name: '** **', value: '** **'},
            {name: '◀️', value: 'Página\nanterior', inline: true},
            {name: '▶️', value: 'Próxima\npágina', inline: true},
            {name: '❌', value: 'Cancelar', inline: true},
            {name: '** **', value: '** **'},
          )
          .setFooter(`Página ${currentPage}/${numberOfPages}`)

        const helpMessage = previousMessage ? previousMessage : await message.channel.send(helpEmbed)
        if (previousMessage) {
          helpMessage.reactions.removeAll()
          helpMessage.edit(helpEmbed)
        }

        if (numberOfPages > 1 && currentPage > 1) {
          helpMessage.react('◀️')
        }
        if (numberOfPages > 1 && currentPage < numberOfPages) {
          helpMessage.react('▶️')
        }
        helpMessage.react('❌')

        const filter = (reaction:Discord.MessageReaction, user:Discord.User) => ['◀️', '▶️', '❌'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

        helpMessage.awaitReactions(filter, { max: 1, time: 60000 })
          .then(collected => {
            const reaction = collected.first()

            if (reaction?.emoji.name === '◀️') {
              if (numberOfPages > 1 && currentPage > 1) {
                --currentPage
              }
              helpEmbed.fields = []
              sendHelpEmbed(helpMessage)
            } else if (reaction?.emoji.name === '▶️') {
              if (numberOfPages > 1 && currentPage < numberOfPages) {
                ++currentPage
              }
              helpEmbed.fields = []
              sendHelpEmbed(helpMessage)
            } else {
              helpEmbed.fields = []
              helpEmbed
                .setDescription('A visualização dos comandos foi encerrada.')
                .setFooter('')
              helpMessage.reactions.removeAll()
              helpMessage.edit(helpEmbed)
            }
          })
          .catch(error => {
            console.error(error)
            helpEmbed.fields = []
            helpEmbed
              .setDescription('A visualização dos comandos foi encerrada.')
              .setFooter('')
            helpMessage.reactions.removeAll()
            helpMessage.edit(helpEmbed)
          })
      }

      sendHelpEmbed()
    } else {
      const commandName = args[0].normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
      const command = commands.get(commandName) || commands.find((command:any) => command.aliases && command.aliases.includes(commandName))

      const helpEmbed = new Discord.MessageEmbed()
        .setTitle('Comandos')
        .setDescription('O comando especificado não foi encontrado!')

      if (!command) return message.channel.send(helpEmbed)

      helpEmbed
        .setTitle(command.name)
        .setDescription(command.description)
        .addField('** **', '** **')
        .addField('Apelidos', command.aliases.join(", "), true)
        .addField('Uso', `${prefix}${command.name}${(command.usage) ? ` \`${command.usage}\`` : ''}`, true)

      message.channel.send(helpEmbed)
    }    
  }
}