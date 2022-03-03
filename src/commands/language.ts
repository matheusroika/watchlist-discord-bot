import Discord from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import Mustache from 'mustache'

import Server from '../models/Server'
import { setNewConfig } from '../bot'
import availableLanguages from '../utils/getAvailableLanguages'

import { LanguageFile } from '../types/bot'

export = {
  getCommand() {
    const command = availableLanguages.map(language => {
      const languageFile: LanguageFile = require(`../../languages/${language}.json`)
      const commandTranslation = languageFile.commands.language

      return {
        [language]: {
          data: new SlashCommandBuilder()
            .setName(commandTranslation.name)
            .setDescription(commandTranslation.description)
            .addStringOption(option => {
              option.setName(commandTranslation.optionName)
                .setDescription(commandTranslation.optionDescription)
                .setRequired(true)

              availableLanguages.filter(item => item !== language).forEach(item => {
                const itemFile: LanguageFile = require(`../../languages/${item}.json`)
                option.addChoice(`${itemFile.languageName} (${item})`, item)
              })

              return option
            }),
        }
      }
    })
  
    return command
  },
  async execute(interaction: Discord.CommandInteraction) {
    const config = await Server.findOne({serverId: interaction.guildId}, 'language')
    const { commands }: LanguageFile = require(`../../languages/${config.language}.json`)
    const languageCommand = commands.language

    const language = interaction.options.getString(languageCommand.optionName) as string
    config.language = language

    await config.save()
    setNewConfig('language', config.language, interaction)
    const languageImport = require(`../../languages/${config.language}.json`)
    await interaction.reply(Mustache.render(languageImport.commands.language.success, [language]))
  }
}