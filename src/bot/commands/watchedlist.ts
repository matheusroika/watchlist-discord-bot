import Discord from "discord.js"
import { SlashCommandBuilder } from '@discordjs/builders'
import Mustache from 'mustache'

import Server from "../../models/Server"
import availableLanguages from "../utils/getAvailableLanguages"

import { Config, LanguageFile } from "../../types/bot"

export = {
  getCommand() {
    const command = availableLanguages.map(language => {
      const languageFile: LanguageFile = require(`../languages/${language}.json`)
      const commandTranslation = languageFile.commands.watchedlist

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
    const { commands, common }: LanguageFile = require(`../languages/${language}.json`)
    const listCommand = commands.list

    const { watched } = await Server.findOne({serverId: interaction.guildId}, 'watched')
    const maxInPage = 10
    let currentPage = 1
    const numberOfPages = Math.ceil(watched.length/maxInPage)

    const listEmbed = new Discord.MessageEmbed()
      .setTitle(listCommand.title)
      .setDescription(listCommand.description)
      .addField('** **', '** **')
    
    if(!watched.length) {
      listEmbed.fields = []
      listEmbed.setDescription(Mustache.render(listCommand.emptyError, [commands.watched.name]))

      await interaction.reply({ embeds: [listEmbed], ephemeral: true })
      return
    }
     
    function addFields(startingIndex: number, finishingIndex: number) {
      let addFieldCount = 0
      for (let i = startingIndex; i < finishingIndex; i++) {
        listEmbed.addField(watched[i].media_type === 'movie' ? common.movie : common.tv,
          watched[i].title
            ? (watched[i].title.toLowerCase() === watched[i].original_title.toLowerCase())
              ? `**[${watched[i].original_title}](https://www.themoviedb.org/${watched[i].media_type}/${watched[i].id})**`
              : `**[${watched[i].original_title}](https://www.themoviedb.org/${watched[i].media_type}/${watched[i].id})** | *${watched[i].title}*`
            : '** **',
          true)

        ++addFieldCount
        if (addFieldCount === 1) {
          listEmbed.addField('** **', '** **', true)
        }
        if (addFieldCount === 2 && i < finishingIndex - addFieldCount) {
          listEmbed.addField('** **', '** **')
          addFieldCount = 0
        }
      }
    }

    async function getListEmbed() {
      const startingIndex = (currentPage - 1) * maxInPage
      const finishingIndex = (watched.length - (maxInPage * (currentPage - 1)) > maxInPage) ? currentPage * maxInPage : watched.length

      listEmbed.fields = []
      listEmbed.addField('** **', '** **')

      addFields(startingIndex, finishingIndex)

      listEmbed
        .addField('** **', '** **')
        .setFooter({ text: Mustache.render(listCommand.pagination, {
          currentPage,
          numberOfPages
        }) })
      
      const buttonRow = new Discord.MessageActionRow()

      if (numberOfPages > 1 && currentPage > 1) {
        buttonRow.addComponents(
          new Discord.MessageButton()
            .setCustomId('prevPage')
            .setLabel('◀️')
            .setStyle('PRIMARY')
        )
      } 
      if (numberOfPages > 1 && currentPage < numberOfPages) {
        buttonRow.addComponents(
          new Discord.MessageButton()
            .setCustomId('nextPage')
            .setLabel('▶️')
            .setStyle('PRIMARY')
        )
      }
      buttonRow.addComponents(
        new Discord.MessageButton()
          .setCustomId('cancel')
          .setLabel('❌')
          .setStyle('PRIMARY'),
      )

      return {
        listEmbed,
        buttonRow
      }
    }
    
    const { buttonRow } = await getListEmbed()
    await interaction.reply({ embeds: [listEmbed], components: [buttonRow], ephemeral: true })

    const collector = interaction.channel?.createMessageComponentCollector()
    collector?.on('collect', async newInteraction => {
      if (newInteraction.customId === 'prevPage') {
        if (numberOfPages > 1 && currentPage > 1) --currentPage
        const newEmbed = await getListEmbed()
        await newInteraction.update({ embeds:[newEmbed.listEmbed], components:[newEmbed.buttonRow] })
      } else if (newInteraction.customId === 'nextPage') {
        if (numberOfPages > 1 && currentPage < numberOfPages) ++currentPage
        const newEmbed = await getListEmbed()
        await newInteraction.update({ embeds:[newEmbed.listEmbed], components:[newEmbed.buttonRow] })
      } else if (newInteraction.customId === 'cancel') {
        listEmbed.fields = []
        listEmbed
          .setDescription(listCommand.cancelled)
          .setFooter({ text:'' })
          
        await newInteraction.update({ embeds: [listEmbed], components: [] })
      }
    })
  }
}