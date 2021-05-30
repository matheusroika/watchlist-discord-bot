import Discord from 'discord.js'

import { Command, Config, LanguageFile } from '../types/bot'

import Mustache from 'mustache'
import getLanguages from '../utils/getLanguages'

export = {
  languages: getLanguages('helpCommand', false, true),
  async execute(message: Discord.Message, args: Array<string>, { prefix, language }: Config, commands: Discord.Collection<string, Discord.Collection<string, Command>>) {
    const { helpCommand, common }: LanguageFile = require(`../../languages/${language}.json`)
    
    if (!args.length) {
      const commandMessage = message
      const maxInPage = 4
      let currentPage = 1
      const numberOfCommands = commands.get(language)?.size as number
      const numberOfPages = Math.ceil(numberOfCommands/maxInPage)

      const helpEmbed = new Discord.MessageEmbed()
        .setTitle(helpCommand.title)
        .setDescription(helpCommand.argsLegend)
      
      function addFields(startingIndex: number, finishingIndex: number) {
        const commandsArray: Command[] = Array.from(commands.get(language)?.values() as IterableIterator<Command>)
        for (let i = startingIndex; i < finishingIndex; i++) {
          helpEmbed
            .addField('** **', '** **')
            .addField(commandsArray[i].name, '** **')
            .addField(helpCommand.translations.description, commandsArray[i].description, true)
            commandsArray[i].aliases && helpEmbed.addField(helpCommand.translations.aliases, commandsArray[i].aliases.join(', '), true)
            helpEmbed.addField(helpCommand.translations.usage, `${prefix}${commandsArray[i].name}${(commandsArray[i].usage) ? ` \`${commandsArray[i].usage}\`` : ''}`, true)
        }
      }

      async function sendHelpEmbed(previousMessage?: Discord.Message) {
        const startingIndex = (currentPage - 1) * maxInPage
        const finishingIndex = (numberOfCommands - (maxInPage * (currentPage - 1)) > maxInPage) ? currentPage * maxInPage : numberOfCommands
        
        addFields(startingIndex, finishingIndex)

        helpEmbed
          .addFields(
            {name: '** **', value: '** **'},
            {name: '◀️', value: common.previousPage, inline: true},
            {name: '▶️', value: common.nextPage, inline: true},
            {name: '❌', value: common.cancel, inline: true},
            {name: '** **', value: '** **'},
          )
          .setFooter(Mustache.render(helpCommand.pagination, {
            currentPage,
            numberOfPages
          }))

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

        const filter = (reaction: Discord.MessageReaction, user: Discord.User) => ['◀️', '▶️', '❌'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

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
                .setDescription(helpCommand.cancelled)
                .setFooter('')
              helpMessage.reactions.removeAll()
              helpMessage.edit(helpEmbed)
            }
          })
          .catch(error => {
            console.error(error)
            helpEmbed.fields = []
            helpEmbed
              .setDescription(helpCommand.cancelled)
              .setFooter('')
            helpMessage.reactions.removeAll()
            helpMessage.edit(helpEmbed)
          })
      }

      sendHelpEmbed()
    } else {
      const commandName = args[0].normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
      const command = commands.get(language)?.get(commandName) || commands.get(language)?.find(command => command.aliases && command.aliases.includes(commandName))

      const helpEmbed = new Discord.MessageEmbed()
        .setTitle(helpCommand.title)
        .setDescription(helpCommand.notFound)

      if (!command) return message.channel.send(helpEmbed)

      helpEmbed
        .setTitle(command.name)
        .setDescription(command.description)
        .addField('** **', '** **')
        .addField(helpCommand.translations.aliases, command.aliases.join(", "), true)
        .addField(helpCommand.translations.usage, `${prefix}${command.name}${(command.usage) ? ` \`${command.usage}\`` : ''}`, true)

      message.channel.send(helpEmbed)
    }    
  }
}