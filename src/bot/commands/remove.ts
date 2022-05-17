import Discord from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import Mustache from 'mustache'

import Server from '../../models/Server'
import availableLanguages from '../utils/getAvailableLanguages'

const { images }: ImagesCache = require("../cache/imagesCache.json")
import { Config, ImagesCache, LanguageFile, Server as TypeServer, WatchlistMedia } from '../../types/bot'

export = {
  getCommand() {
    const command = availableLanguages.map(language => {
      const languageFile: LanguageFile = require(`../languages/${language}.json`)
      const commandTranslation = languageFile.commands.remove

      return {
        [language]: {
          data: new SlashCommandBuilder()
            .setName(commandTranslation.name)
            .setDescription(commandTranslation.description)
            .addStringOption(option =>
              option.setName(commandTranslation.optionName)
                .setDescription(commandTranslation.optionDescription)
                .setRequired(true)
            ),
        }
      }
    })
  
    return command
  },
  async execute(interaction: Discord.CommandInteraction, { language }: Config) {
    const { commands, common }: LanguageFile = require(`../languages/${language}.json`)
    const removeCommand = commands.remove

    const server: TypeServer = await Server.findOne({serverId: interaction.guildId}, 'watchlist watched')
    const { watchlist, watched } = server
    const titleToRemove = normalizeString(interaction.options.getString(removeCommand.optionName) as string)
    let removeIndex = 0
    const removeList: WatchlistMedia[] = []
    const removeEmbed = new Discord.MessageEmbed()

    if(!watchlist.length) {
      removeEmbed
        .setTitle(removeCommand.title)
        .setDescription(Mustache.render(removeCommand.emptyError, [removeCommand.name]))
        
      await interaction.reply({ embeds: [removeEmbed] })
      return
    }

    function normalizeString(string: string) {
      return string.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
    }

    for (const media of watchlist) {
      const normalizedTitle = normalizeString(media.title)
      const normalizedOriginalTitle = normalizeString(media.original_title)

      if (normalizedTitle.includes(titleToRemove) || normalizedOriginalTitle.includes(titleToRemove)) {
        removeList.push(media)
      }
    }

    for (const media of watched) {
      const normalizedTitle = normalizeString(media.title)
      const normalizedOriginalTitle = normalizeString(media.original_title)

      if (normalizedTitle.includes(titleToRemove) || normalizedOriginalTitle.includes(titleToRemove)) {
        removeList.push(media)
      }
    }

    if (removeList.length === 0) {
      removeEmbed
        .setTitle(removeCommand.title)
        .setDescription(removeCommand.notFound)
      await interaction.reply({ embeds: [removeEmbed] })
      return
    }

    async function getRemoveEmbed() {
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
          {name: '◀️', value: common.previousMedia, inline: true},
          {name: '▶️', value: common.nextMedia, inline: true},
          {name: '** **', value: '** **'},
          {name: '✅', value: common.confirm, inline: true},
          {name: '❌', value: common.cancel, inline: true},
          {name: '** **', value: '** **'},
        )
        .setFooter({ text: Mustache.render(removeCommand.pagination, {
          removeIndex: removeIndex + 1,
          removeListLength: removeList.length
        }) })

      const buttonRow = new Discord.MessageActionRow()
      if (removeIndex > 0) {
        buttonRow.addComponents(
          new Discord.MessageButton()
            .setCustomId('prevPage')
            .setLabel('◀️')
            .setStyle('PRIMARY')
        )
      }

      if (removeIndex < removeList.length - 1) {
        buttonRow.addComponents(
          new Discord.MessageButton()
            .setCustomId('nextPage')
            .setLabel('▶️')
            .setStyle('PRIMARY')
        )
      }

      buttonRow.addComponents(
        new Discord.MessageButton()
          .setCustomId('confirm')
          .setLabel('✅')
          .setStyle('PRIMARY'),
        new Discord.MessageButton()
          .setCustomId('cancel')
          .setLabel('❌')
          .setStyle('PRIMARY'),
      )

      return {
        removeEmbed,
        removeMedia,
        buttonRow
      }
    }
    
    const { buttonRow } = await getRemoveEmbed()
    await interaction.reply({ embeds: [removeEmbed], components: [buttonRow], ephemeral: true })

    const collector = interaction.channel?.createMessageComponentCollector()
    collector?.on('collect', async newInteraction => {
      if (newInteraction.customId === 'prevPage') {
        if (removeIndex > 0) --removeIndex
        const newReply = await getRemoveEmbed()
        await newInteraction.update({ embeds: [newReply.removeEmbed], components: [newReply.buttonRow] })
      } else if (newInteraction.customId === 'nextPage') {
        if (removeIndex < removeList.length - 1) ++removeIndex
        const newReply = await getRemoveEmbed()
        await newInteraction.update({ embeds: [newReply.removeEmbed], components: [newReply.buttonRow] })
      } else if (newInteraction.customId === 'confirm') {
        const newReply = await getRemoveEmbed()

        removeEmbed.fields = []
        removeEmbed
          .setDescription('')
          .setFooter({ text: '' })
          .addField(removeCommand.title, removeCommand.successEphemeral)

        server.watchlist = watchlist.filter(media => media !== newReply.removeMedia)
        server.watched = watched.filter(media => media !== newReply.removeMedia)
        await server.save()

        await newInteraction.update({ embeds: [removeEmbed], components: [] })

        removeEmbed.fields = []
        removeEmbed.addField(removeCommand.title, Mustache.render(removeCommand.success, [newInteraction.user.toString()]))

        await newInteraction.followUp({ embeds: [removeEmbed], ephemeral: false })
        collector.stop()
        return
      } else if (newInteraction.customId === 'cancel') {
        removeEmbed.fields = []
        removeEmbed
          .setTitle(removeCommand.title)
          .setDescription(removeCommand.cancelled)
          .setURL('')
          .setThumbnail('')
          .setFooter({ text: '' })
        
        await newInteraction.update({ embeds: [removeEmbed], components: [] })
        collector.stop()
        return
      }
    })  
  }
}