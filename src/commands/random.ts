import Discord from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders';

import Server from '../models/Server'

import { Config, GenresCache, ImagesCache, LanguageFile, Server as TypeServer, WatchlistMedia } from '../types/bot'
const { images }: ImagesCache = require("../../cache/imagesCache.json")

import Mustache from 'mustache'

import availableLanguages from '../utils/getAvailableLanguages';

export = {
  getCommand() {
    const command = availableLanguages.map(language => {
      const languageFile: LanguageFile = require(`../../languages/${language}.json`)
      const commandTranslation = languageFile.commands.random

      return {
        [language]: {
          data: new SlashCommandBuilder()
            .setName(commandTranslation.name)
            .setDescription(commandTranslation.description)
            .addStringOption(option =>
              option.setName(commandTranslation.optionName)
                .setDescription(commandTranslation.optionDescription)
            ),
        }
      }
    })
  
    return command
  },
  async execute(interaction: Discord.CommandInteraction, { language }: Config) {
    const { commands, common }: LanguageFile = require(`../../languages/${language}.json`)
    const randomCommand = commands.random
    const genresCache: GenresCache = require(`../../cache/genresCache_${language}`)
    
    const { watchlist }: TypeServer = await Server.findOne({serverId: interaction.guildId}, 'watchlist')
    const args = interaction.options.getString(randomCommand.optionName)
    const argsList = args ? args.split('+') : []

    if(!watchlist.length) {
      const errorEmbed = new Discord.MessageEmbed()
        .setTitle(randomCommand.title)
        .setDescription(Mustache.render(randomCommand.emptyError, [randomCommand.name]))
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
      return
    }

    function normalizeString(string:string) {
      return string.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
    }

    function getAvailableGenres() {
      const availableGenres: Array<string> = []

      watchlist.forEach(media => {
        media.genres.forEach(genre => {
          const cachedGenre = genresCache.genres.find(cachedGenre => cachedGenre.id === Number(genre))
          if (cachedGenre) {
            availableGenres.push(cachedGenre.name)
          }  
        })
      })

      return availableGenres
    }

    function getMediaGenres(media: WatchlistMedia) {
      const mediaGenres: Array<string> = []

      media.genres.forEach(genre => {
        const cachedGenre = genresCache.genres.find(cachedGenre => cachedGenre.id === Number(genre))
        if (cachedGenre) {
          mediaGenres.push(cachedGenre.name)
        }  
      })

      return mediaGenres
    }

    function getRandomInt(min: number, max: number) {
      return Math.floor(Math.random() * (max - min)) + min;
    }

    let randomIndex = getRandomInt(0, watchlist.length)
    let media = watchlist[randomIndex]

    async function getMediaEmbed() {   
      const movieEmbed = new Discord.MessageEmbed()
        .setTitle(
          (media.title)
            ? (media.title.toLowerCase() === media.original_title.toLowerCase())
              ? media.title
              : `${media.title} *(${media.original_title})*`
            : media.original_title
        )
        .setURL(`https://www.themoviedb.org/${media.media_type}/${media.id}`)
        .setDescription(media.description)
        .setThumbnail(`${images.secure_base_url}/${images.poster_sizes[4]}/${media.poster_path}`)
        .addFields(
          {name: '** **', value: '** **'},
          {name: '✅', value: common.confirm, inline: true},
          {name: '🔁', value: randomCommand.drawAgain, inline: true},
          {name: '❌', value: common.cancel, inline: true},
        )
        
        const buttonRow = new Discord.MessageActionRow()
        buttonRow.addComponents(
          new Discord.MessageButton()
            .setCustomId('confirm')
            .setLabel('✅')
            .setStyle('PRIMARY'),
          new Discord.MessageButton()
            .setCustomId('drawAgain')
            .setLabel('🔁')
            .setStyle('PRIMARY'),
          new Discord.MessageButton()
            .setCustomId('cancel')
            .setLabel('❌')
            .setStyle('PRIMARY')
        )

      return {
        movieEmbed,
        buttonRow
      }
    }
    
    if (argsList.length > 0) {
      const argsGenres = argsList.map(genre => normalizeString(genre))
      const availableGenres = getAvailableGenres().map(genre => normalizeString(genre))
      const mediaGenres = getMediaGenres(media).map(genre => normalizeString(genre))
      
      if (!availableGenres.some(genre => argsGenres.includes(genre))) {
        await interaction.reply({ content: randomCommand.genreNotFound, ephemeral: true })
        return
      } else if (!mediaGenres.some(genre => argsGenres.includes(genre))) {
        const newReply = await getMediaEmbed()
        await interaction.reply({ embeds: [newReply.movieEmbed], components: [newReply.buttonRow], ephemeral: true })
      }
    } else {
      const newReply = await getMediaEmbed()
      await interaction.reply({ embeds: [newReply.movieEmbed], components: [newReply.buttonRow], ephemeral: true })
    }

    const collector = interaction.channel?.createMessageComponentCollector()
    collector?.on('collect', async newInteraction => {
      if (newInteraction.customId === 'confirm') {
        const newReply = await getMediaEmbed()
        newReply.movieEmbed.fields = []
        newReply.movieEmbed
          .setDescription('')
          .addField(randomCommand.title, randomCommand.successEphemeral)

        await newInteraction.update({ embeds: [newReply.movieEmbed], components: [] })

        newReply.movieEmbed.fields = []
        newReply.movieEmbed.addField(randomCommand.title, Mustache.render(randomCommand.success, [newInteraction.user.toString()]))

        await newInteraction.followUp({ embeds: [newReply.movieEmbed], ephemeral: false })
        collector.stop()
        return
      } else if (newInteraction.customId === 'cancel') {
        const replyEmbed = new Discord.MessageEmbed()
          .setTitle(randomCommand.title)
          .setDescription(randomCommand.cancelled)
          .setURL('')
          .setThumbnail('')

        await newInteraction.update({ embeds: [replyEmbed], components: [] })
        collector.stop()
        return
      } else if (newInteraction.customId === 'drawAgain') {
        randomIndex = getRandomInt(0, watchlist.length)
        media = watchlist[randomIndex]
        const newReply = await getMediaEmbed()
        await newInteraction.update({ embeds: [newReply.movieEmbed], components: [newReply.buttonRow] })
      }
    })
  }
}