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
      const commandTranslation = languageFile.commands.channel

      return {
        [language]: {
          data: new SlashCommandBuilder()
            .setName(commandTranslation.name)
            .setDescription(commandTranslation.description)
            .addChannelOption(option =>
              option.setName(commandTranslation.optionName)
                .setDescription(commandTranslation.optionDescription)
            )
            .addStringOption(option =>
              option.setName(commandTranslation.removeOptionName)
                .setDescription(commandTranslation.removeOptionDescription)
                .addChoice(commandTranslation.removeOptionChoice, 'remove')
            )
        }
      }
    })
  
    return command
  },
  async execute(interaction: Discord.CommandInteraction) {
    const config = await Server.findOne({serverId: interaction.guildId}, 'channelToListen language')
    const { commands }: LanguageFile = require(`../../languages/${config.language}.json`)
    const channelCommand = commands.channel

    const remove = interaction.options.getString(channelCommand.removeOptionName)
    if (remove && config.channelToListen) {
      config.channelToListen = ''
      await config.save()
      setNewConfig('channelToListen', config.channelToListen, interaction)

      await interaction.reply(channelCommand.removeSuccess)
      return
    }

    const channelId = interaction.options.getChannel(channelCommand.optionName)?.id
     
    if (!channelId && !config.channelToListen) {
      await interaction.reply({ content: Mustache.render(channelCommand.monitoringInstructions, [channelCommand.name]), ephemeral: true })
      return
    } else if (!channelId) {
      await interaction.reply({ content: Mustache.render(channelCommand.currentMonitoring, [config.channelToListen]), ephemeral: true })
      return
    } else if (interaction.guild?.channels.cache.get(channelId)?.type !== 'GUILD_TEXT') {
      await interaction.reply({ content: channelCommand.textChannel, ephemeral: true })
      return
    } else if (channelId === config.channelToListen) {
      await interaction.reply({ content: Mustache.render(channelCommand.alreadyMonitoring, [channelId]), ephemeral: true })
      return
    }

    config.channelToListen = channelId
    await config.save()
    setNewConfig('channelToListen', config.channelToListen, interaction)
    await interaction.reply(Mustache.render(channelCommand.success, [channelId]))
  }
}