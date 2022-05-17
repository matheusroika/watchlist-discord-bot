import Discord from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import fs from 'fs'
import path from 'path'
import Mustache from 'mustache'

import commands from '../utils/getCommands'
import availableLanguages from '../utils/getAvailableLanguages'

import { Command, Config, LanguageFile } from '../../types/bot'
type CommandFile = 'add' | 'channel' | 'help' | 'language' | 'list' | 'random' | 'remove'

export = {
  getCommand() {
    const command = availableLanguages.map(language => {
      const languageFile: LanguageFile = require(`../languages/${language}.json`)
      const commandTranslation = languageFile.commands.help

      return {
        [language]: {
          data: new SlashCommandBuilder()
            .setName(commandTranslation.name)
            .setDescription(commandTranslation.description),
        }
      }
    })
  
    return command
  },
  async execute(interaction: Discord.CommandInteraction, { language }: Config) {
    const { commands: languageCommands }: LanguageFile = require(`../languages/${language}.json`)
    const helpCommand = languageCommands.help

    const helpEmbed = new Discord.MessageEmbed()
      .setTitle(helpCommand.title)
    
    const commandFiles = fs.readdirSync(path.resolve(__dirname, '../commands')).map(file => file.replace(/\.(j|t)s$/, '')) as Array<CommandFile>
    const commandsCollection = commands.get(language)
    const commandsArray = Array.from(commandsCollection?.values() as IterableIterator<Command>)
    let helpDescription = ''

    commandsArray.forEach((command, index) => {
      helpDescription += `**/${command.data.name}** - ${Mustache.render(
        languageCommands[commandFiles[index]].longDescription, {
          availableLanguages: availableLanguages.join(', ')
        }
      )}\n`
    })

    helpEmbed.setDescription(helpDescription)

    await interaction.reply({ embeds: [helpEmbed], ephemeral: true })
  }
}