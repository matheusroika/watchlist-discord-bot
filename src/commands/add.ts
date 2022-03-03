import Discord from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { format } from 'date-fns'
import Mustache from 'mustache'

import Server from '../models/Server'
import { api } from '../services/api'
import availableLanguages from '../utils/getAvailableLanguages'

const { images }: ImagesCache = require("../../cache/imagesCache.json")
import { Config, ImagesCache, LanguageFile, Media, TMDBSearchResult } from '../types/bot'

export = {
  getCommand() {
    const command = availableLanguages.map(language => {
      const languageFile: LanguageFile = require(`../../languages/${language}.json`)
      const commandTranslation = languageFile.commands.add

      return {
        [language]: {
          data: new SlashCommandBuilder()
            .setName(commandTranslation.name)
            .setDescription(commandTranslation.description)
            .addSubcommand(subcommand =>
              subcommand.setName(commandTranslation.subcommands.movie.name)
                .setDescription(commandTranslation.subcommands.movie.description)
                .addStringOption(option =>
                  option.setName(commandTranslation.subcommands.movie.optionName)
                    .setDescription(commandTranslation.subcommands.movie.optionDescription)
                    .setRequired(true)
                )
            )
            .addSubcommand(subcommand =>
              subcommand.setName(commandTranslation.subcommands.tv.name)
                .setDescription(commandTranslation.subcommands.tv.description)
                .addStringOption(option =>
                  option.setName(commandTranslation.subcommands.tv.optionName)
                    .setDescription(commandTranslation.subcommands.tv.optionDescription)
                    .setRequired(true)
                )
            )
            .addSubcommand(subcommand =>
              subcommand.setName(commandTranslation.subcommands.person.name)
                .setDescription(commandTranslation.subcommands.person.description)
                .addStringOption(option =>
                  option.setName(commandTranslation.subcommands.person.optionName)
                    .setDescription(commandTranslation.subcommands.person.optionDescription)
                    .setRequired(true)
                )
            )
        }
      }
    })
  
    return command
  },
  async execute(interaction: Discord.CommandInteraction, { language }: Config) {
    const { commands, common }: LanguageFile = require(`../../languages/${language}.json`)
    const addCommand = commands.add

    const server = await Server.findOne({serverId: interaction.guildId})

    const searchTitles = [
      interaction.options.getString(addCommand.subcommands.movie.optionName),
      interaction.options.getString(addCommand.subcommands.tv.optionName),
      interaction.options.getString(addCommand.subcommands.person.optionName)
    ]
    const searchTitle = searchTitles.find(title => title)

    const subcommandTypes: Array<'movie' | 'tv' | 'person'> = ['movie', 'tv', 'person']
    let searchType = subcommandTypes.find(subcommand => addCommand.subcommands[subcommand].name === interaction.options.getSubcommand())
    
    const maxInPage = 20
    let currentMediaIndex = 0
    let currentKnownForIndex = 0
    let currentQueryPage = 1

    async function getMediaData(currentQueryPage: number, selectedLanguage: string = language) {
      const { data } = await api.get(`search/${searchType}`, {
        params: {
          language: selectedLanguage,
          query: searchTitle,
          page: currentQueryPage,
        }
      })

      return data as TMDBSearchResult
    }

    async function getMediaEmbed() {
      const knownForLength = mediaData.results[currentMediaIndex]?.known_for?.length as number
      if (currentKnownForIndex > knownForLength - 1 ) {
        ++currentMediaIndex
        currentKnownForIndex = 0
      }

      if (currentKnownForIndex < 0) {
        --currentMediaIndex
        currentKnownForIndex = 0
      }

      if (currentMediaIndex > maxInPage - 1 && mediaData.total_pages > currentQueryPage) {
        ++currentQueryPage
        currentMediaIndex = 0
        mediaData = await getMediaData(currentQueryPage)
      }

      if (currentMediaIndex < 0) {
        --currentQueryPage
        currentMediaIndex = 0
        mediaData = await getMediaData(currentQueryPage)
      }

      const isPerson = (searchType === 'person')
      if (isPerson) {
        mediaData.results = mediaData.results.filter(result => {
          return result.known_for?.length as number > 0
        })
      }

      const media = (isPerson)
        ? mediaData.results[currentMediaIndex].known_for?.[currentKnownForIndex] as Media
        : mediaData.results[currentMediaIndex]
      const person = mediaData.results[currentMediaIndex]
      
      if (!!!media.overview) {
        const mediaDataInEnglish = await getMediaData(currentQueryPage, 'en-US')
        media.overview = isPerson
          ? mediaDataInEnglish.results[currentMediaIndex].known_for?.[currentKnownForIndex].overview
          : mediaDataInEnglish.results[currentMediaIndex].overview
      }

      const isMovie = (searchType === 'movie' || (searchType === 'person' && media.media_type === 'movie'))
      const mediaOriginalTitle = isMovie ? media.original_title : media.original_name
      const mediaTitle = isMovie ? media.title : media.name
      
      const mediaEmbed = new Discord.MessageEmbed()
        .setTitle(
          (mediaTitle && mediaOriginalTitle)
            ? (mediaTitle.toLowerCase() === mediaOriginalTitle.toLowerCase())
              ? mediaTitle
              : `${mediaTitle} *(${mediaOriginalTitle})*`
            : mediaOriginalTitle as string
        )
        .setURL(`https://www.themoviedb.org/${(searchType === 'person') ? media.media_type : searchType}/${media.id}`)
        .setDescription((media.overview) ? media.overview : '')
        .setThumbnail(`${images.secure_base_url}/${images.poster_sizes[4]}/${media.poster_path}`)
        .addFields(
          {name: '** **', value: '** **'},
          {name: '◀️', value: common.previousMedia, inline: true},
          {name: '▶️', value: common.nextMedia, inline: true},
          {name: '** **', value: '** **'},
          {name: '✅', value: common.add, inline: true},
          {name: '❌', value: common.cancel, inline: true},
          {name: '** **', value: '** **'},
        )
        .setFooter(
          { text:
            `${Mustache.render(addCommand.footer.value, {
              currentQueryPage,
              mediaDataTotalPages: mediaData.total_pages,
              currentMediaIndex: currentMediaIndex + 1,
              mediaDataResultsLength: mediaData.results.length,
            })}`
            +
            `${isPerson 
              ? Mustache.render(addCommand.footer.isPerson, {
                  mediaDataName: mediaData.results[currentMediaIndex].name,
                  currentKnownForIndex: currentKnownForIndex + 1,
                  mediaDataLength: mediaData.results[currentMediaIndex].known_for?.length as number,
                })
              : ''}`
          }
        )

      const buttonRow = new Discord.MessageActionRow()

      if (currentKnownForIndex > 0 || currentMediaIndex > 0 || currentQueryPage > 1) {
        buttonRow.addComponents(
          new Discord.MessageButton()
            .setCustomId('prevPage')
            .setLabel('◀️')
            .setStyle('PRIMARY')
        )
      }

      if (mediaData.total_results - 1 > (currentQueryPage - 1) * maxInPage + currentMediaIndex) {
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

      function mediaSelectFunction(personMedia: Media, index: number) {
        const resultIsMovie = (searchType === 'movie' || (searchType === 'person' && personMedia.media_type === 'movie'))
        const resultMediaTitle = resultIsMovie ? personMedia.title : personMedia.name
        const resultMediaOriginalTitle = resultIsMovie ? personMedia.original_title : personMedia.original_name

        let resultLabel = (resultMediaTitle && resultMediaOriginalTitle)
          ? (resultMediaTitle.toLowerCase() === resultMediaOriginalTitle.toLowerCase())
            ? resultMediaTitle
            : `${resultMediaTitle} (${resultMediaOriginalTitle})`
          : resultMediaOriginalTitle as string

        let resultDescription = personMedia.overview as string

        if (resultLabel.length > 97) {
          resultLabel = resultLabel.substring(0, 97) + '...'
        }
        
        if (resultDescription.length > 97) {
          resultDescription = resultDescription.substring(0, 97) + '...'
        }
        
        return {
          label: resultLabel,
          description: resultDescription,
          value: index.toString(),
          default: (personMedia.id === media.id)
        }
      }

      function getMediaSelectOptions(personIndex?: number) {
        const mediaSelectOptions: Discord.MessageSelectOptionData[] = (searchType === 'person')
          ? mediaData.results[personIndex as number].known_for?.map((personMedia, index) => {
            return mediaSelectFunction(personMedia, index)
          }) as Discord.MessageSelectOptionData[]
          : mediaData.results.map((result, index) => {
            return mediaSelectFunction(result, index)
          })
        
        if (searchType !== 'person') {
          if (currentQueryPage > 1) {
            const prevPageOption = {
              label: '◀️',
              value: 'prevPage'
            }
  
            mediaSelectOptions.unshift(prevPageOption)
          }
  
          if (mediaData.total_results - 1 > currentQueryPage * maxInPage) {
            const nextPageOption = {
              label: '▶️',
              value: 'nextPage'
            }
  
            mediaSelectOptions.push(nextPageOption)
          }
        }

        return mediaSelectOptions
      }
      
      function getMediaSelect(personIndex?: number) {
        const mediaSelect = new Discord.MessageActionRow()
        mediaSelect.addComponents(
          new Discord.MessageSelectMenu()
            .setCustomId('media')
            .setPlaceholder(addCommand.selectMedia)
            .setOptions(getMediaSelectOptions(personIndex))
        )

        return mediaSelect
      }
      
      const personSelect = new Discord.MessageActionRow()
      if (searchType === 'person') {
        const personSelectOptions: Discord.MessageSelectOptionData[] = mediaData.results.map((result, index) => {
          const personMedias = result.known_for?.map(personMedia => {
            if (personMedia.media_type === 'movie') {
              return personMedia.original_title as string
            } else if (personMedia.media_type === 'tv') {
              return personMedia.original_name as string
            }
          })

          let resultLabel = result.name as string
          let resultDescription = Mustache.render(addCommand.knownForDescription, {
            knownForDepartment: result.known_for_department,
            personMedias: personMedias?.join(', ')
          })

          if (resultLabel.length > 97) {
            resultLabel = resultLabel.substring(0, 97) + '...'
          }
          
          if (resultDescription.length > 97) {
            resultDescription = resultDescription.substring(0, 97) + '...'
          }

          return {
            label: resultLabel,
            description: resultDescription,
            value: index.toString(),
            default: (result.name === mediaData.results[currentMediaIndex].name)
          }
        })

        if (currentQueryPage > 1) {
          const prevPageOption = {
            label: '◀️',
            value: 'prevPage'
          }

          personSelectOptions.unshift(prevPageOption)
        }

        if (mediaData.total_results - 1 > currentQueryPage * maxInPage) {
          const nextPageOption = {
            label: '▶️',
            value: 'nextPage'
          }

          personSelectOptions.push(nextPageOption)
        }

        personSelect.addComponents(
          new Discord.MessageSelectMenu()
            .setCustomId('person')
            .setPlaceholder(mediaData.results[currentMediaIndex].name as string)
            .setOptions(personSelectOptions)
        )
      }

        return {
          mediaEmbed,
          buttonRow,
          getMediaSelect,
          personSelect,
          person,
          media,
          mediaTitle,
          mediaOriginalTitle,
          mediaData,
          isMovie,
          isPerson
        }
      }
      
    async function sendMediaEmbed() {
      const {
        mediaEmbed, buttonRow, getMediaSelect, personSelect
      } = await getMediaEmbed()

      const interactionComponents = (searchType === 'person') ? [personSelect, getMediaSelect(0), buttonRow] : [getMediaSelect(), buttonRow]
      await interaction.reply({ embeds: [mediaEmbed], components: interactionComponents, ephemeral: true })
    
      const collector = interaction.channel?.createMessageComponentCollector()

      collector?.on('collect', async newInteraction => {
        if (newInteraction.isSelectMenu()) {
          if (newInteraction.customId === 'media') {
            if (searchType === 'person') {
              currentKnownForIndex = Number(...newInteraction.values)
              const newMedia = await getMediaEmbed()
              await newInteraction.update({ embeds: [newMedia.mediaEmbed], components: [newMedia.personSelect, newMedia.getMediaSelect(currentMediaIndex), newMedia.buttonRow] })
            } else {
              if (newInteraction.values[0] === 'nextPage') {
                currentMediaIndex = 20
              } else if (newInteraction.values[0] === 'prevPage') {
                currentMediaIndex = -1
              } else {
                currentMediaIndex = Number(...newInteraction.values)
              }
              
              const newMedia = await getMediaEmbed()
              await newInteraction.update({ embeds: [newMedia.mediaEmbed], components: [newMedia.getMediaSelect(), newMedia.buttonRow] })
            }
            
          } else if (newInteraction.customId === 'person') {
            if (newInteraction.values[0] === 'nextPage') {
              currentMediaIndex = 20
              currentKnownForIndex = 0
            } else if (newInteraction.values[0] === 'prevPage') {
              currentMediaIndex = -1
              currentKnownForIndex = 0
            } else {
              currentMediaIndex = Number(...newInteraction.values)
            }

            const newMedia = await getMediaEmbed()
            await newInteraction.update({ embeds: [newMedia.mediaEmbed], components: [newMedia.personSelect, newMedia.getMediaSelect(currentMediaIndex), newMedia.buttonRow] })
          }
        } else if (newInteraction.customId === 'confirm') {
          const newMedia = await getMediaEmbed()
          console.log(newMedia.media)

          for (const items of server.watchlist) {
            if (items.original_title === newMedia.mediaOriginalTitle) {
              mediaEmbed.fields = []
              const formattedDate = format(new Date(items.addedAt), common.formatOfDate)
              mediaEmbed
                .addFields(
                {name: '** **', value: '** **'},
                {name: addCommand.title, value: 
                  `${newMedia.isMovie
                    ? addCommand.alreadyInWatchlist.isMovieTrue
                    : addCommand.alreadyInWatchlist.isMovieFalse}`
                  +
                  `${Mustache.render(addCommand.alreadyInWatchlist.value, {
                    itemsAddedBy: items.addedBy.id,
                    formattedDate,
                  })}`},
              )
                .setFooter({ text: '' })

              await newInteraction.update({ embeds: [mediaEmbed], components: [] })
              collector.stop()
              return
            }
          }

          const addedBy = {
            id: interaction.user.id,
            username: interaction.user.username,
            bot: interaction.user.bot,
            createdTimestamp: interaction.user.createdTimestamp,
            tag: interaction.user.tag,
            displayAvatarURL: interaction.user.displayAvatarURL()
          }

          const mediaObject = {
            id: newMedia.media.id,
            title: newMedia.mediaTitle,
            original_title: newMedia.mediaOriginalTitle,
            genres: newMedia.media.genre_ids,
            media_type: (searchType === 'person') ? newMedia.media.media_type : searchType,
            description: newMedia.media.overview,
            poster_path: newMedia.media.poster_path,
            addedAt: Date.now(),
            addedBy,
          }

          server.watchlist.push(mediaObject)
          await server.save()            

          newMedia.mediaEmbed.fields = []
          newMedia.mediaEmbed
            .addField(addCommand.title, addCommand.successEphemeral)
            .setDescription('')
            .setFooter({ text: '' })

          await newInteraction.update({ embeds: [newMedia.mediaEmbed], components: [] })

          newMedia.mediaEmbed.fields = []
          newMedia.mediaEmbed.addField(addCommand.title,
            `${Mustache.render(addCommand.success, {
            itemsAddedBy: addedBy.id,
            formattedDate: format(mediaObject.addedAt, common.formatOfDate),
          })}`)

          await newInteraction.followUp({ embeds: [newMedia.mediaEmbed], components: [], ephemeral: false })
          collector.stop()
          
        } else if (newInteraction.customId === 'prevPage') {
          let newMedia = await getMediaEmbed()

          if (newMedia.isPerson) {
            --currentKnownForIndex
            if (currentKnownForIndex < 0 && currentMediaIndex > 0) {
              currentKnownForIndex = newMedia.mediaData.results[currentMediaIndex - 1].known_for?.length as number - 1
              --currentMediaIndex
            } else if (currentKnownForIndex < 0 && currentMediaIndex === 0 && currentQueryPage > 1) {
              --currentQueryPage
              mediaData = await getMediaData(currentQueryPage)
              mediaData.results = mediaData.results.filter(result => {
                return result.known_for?.length as number > 0
              })
              currentMediaIndex = mediaData.results.length - 1
              currentKnownForIndex = mediaData.results[currentMediaIndex].known_for?.length as number - 1
            }
            console.log('knownForIndex: ' + currentKnownForIndex)
          } else {
            if (currentMediaIndex > 0 || currentQueryPage > 1) {
              --currentMediaIndex
            }
            console.log('mediaIndex: ' + currentMediaIndex)
          }
          
          newMedia = await getMediaEmbed()
          if (searchType === 'person') {
            await newInteraction.update({ embeds: [newMedia.mediaEmbed], components: [newMedia.personSelect, newMedia.getMediaSelect(currentMediaIndex), newMedia.buttonRow] })
          } else {
            await newInteraction.update({ embeds: [newMedia.mediaEmbed], components: [newMedia.getMediaSelect(), newMedia.buttonRow] })
          }

        } else if (newInteraction.customId === 'nextPage') {
          let newMedia = await getMediaEmbed()

          if (newMedia.isPerson) {
            ++currentKnownForIndex
            console.log('knownForIndex: ' + currentKnownForIndex)
          } else {
            if (mediaData.total_results - 1 > (currentQueryPage - 1) * maxInPage + currentMediaIndex) {
              ++currentMediaIndex
            }
            console.log('mediaIndex: ' + currentMediaIndex)
          }

          newMedia = await getMediaEmbed()
          if (searchType === 'person') {
            await newInteraction.update({ embeds: [newMedia.mediaEmbed], components: [newMedia.personSelect, newMedia.getMediaSelect(currentMediaIndex), newMedia.buttonRow] })
          } else {
            await newInteraction.update({ embeds: [newMedia.mediaEmbed], components: [newMedia.getMediaSelect(), newMedia.buttonRow] })
          }

        } else {
          mediaEmbed.fields = []
          mediaEmbed
            .setTitle(addCommand.title)
            .setURL('')
            .setDescription(addCommand.cancelled)
            .setThumbnail('')
            .setFooter({ text: '' })
          
          await newInteraction.update({ embeds: [mediaEmbed], components: [] })
          collector.stop()
        }
      })
    }

    let mediaData = await getMediaData(currentQueryPage)
    await sendMediaEmbed()
  }
}