import Discord from "discord.js"
import { format } from "date-fns"
import Mustache from "mustache"

import { api } from "../services/api"
import Server from "../models/Server"

const { images }: ImagesCache = require("../../cache/imagesCache.json")
import { Config, ImagesCache, LanguageFile, Media } from "../types/bot"

export default async function handleListenedMessage(message: Discord.Message, { language }: Config) {
  const { commands, listenedMessage, common }: LanguageFile = require(`../../languages/${language}.json`)
  const addCommand = commands.add

  const server = await Server.findOne({ serverId: message.guildId }, "watchlist")
  const { watchlist } = server
  const commandMessage = message

  async function getMedia(title: string, selectedLanguage: string = language) {
    const { data } = await api.get("search/multi", {
      params: {
        language: selectedLanguage,
        query: title,
      },
    })

    function filterMedia(mediaList: Media[]) {
      return mediaList.filter(currentMedia =>
        currentMedia.release_date || currentMedia.first_air_date ? true : false
      )
    }

    const filteredMedia = data.results.length
      ? filterMedia(data.results)
      : undefined

    return filteredMedia ? filteredMedia[0] : filteredMedia
  }

  if (message.embeds.length > 0 &&
    (message.content.includes("letterboxd") ||
    message.content.includes("themoviedb") ||
    message.content.includes("imdb"))) {
    const searchTitle = message.content.includes("letterboxd")
      ? message.embeds[0].title?.replace(/ \(.*\)$/, "")
      : message.content.includes("themoviedb")
        ? message.embeds[0].title
        : message.embeds[0].title?.replace(/ \(.*\) - IMDb$/, "")
    const mediaItem = await getMedia(searchTitle as string)
    const mediaEmbed = new Discord.MessageEmbed()

    if (!mediaItem) {
      mediaEmbed
        .setTitle(listenedMessage.title)
        .setDescription(listenedMessage.notFound)
      message.channel.send({ embeds: [mediaEmbed] })

      return
    }

    const mediaType = mediaItem.media_type
    const isMovie = mediaType == "movie"
    const isPerson = mediaType == "person"
    const media = isPerson ? (mediaItem.known_for?.[0] as Media) : mediaItem
    const mediaOriginalTitle = isMovie
      ? media.original_title as string
      : media.original_name as string
    const mediaTitle = isMovie ? media.title as string : media.name as string

    if (!!!media.overview) {
      const mediaDataInEnglish = (await getMedia(searchTitle as string, "en-US")) as Media
      media.overview = isPerson
        ? mediaDataInEnglish.known_for?.[0].overview
        : mediaDataInEnglish.overview
    }

    for (const items of watchlist) {
      if (items.original_title === mediaOriginalTitle) {
        const formattedDate = format(new Date(items.addedAt), common.formatOfDate)

        mediaEmbed.setTitle(listenedMessage.title).setDescription(
          `${isMovie
              ? addCommand.alreadyInWatchlist.isMovieTrue
              : addCommand.alreadyInWatchlist.isMovieFalse}` +
          `${Mustache.render(addCommand.alreadyInWatchlist.value, {
            itemsAddedBy: items.addedBy.id,
            formattedDate,
          })}`
        )

        message.channel.send({ embeds: [mediaEmbed] })
        return
      }
    }

    const mediaObject = {
      id: media.id,
      title: mediaTitle,
      original_title: mediaOriginalTitle,
      genres: media.genre_ids,
      media_type: media.media_type,
      description: media.overview,
      poster_path: media.poster_path,
      addedAt: Date.now(),
      addedBy: commandMessage.author,
    }

    if (searchTitle === mediaOriginalTitle) {
      server.watchlist.push(mediaObject)
      await server.save()

      mediaEmbed
        .setTitle(mediaTitle && mediaOriginalTitle
          ? mediaTitle.toLowerCase() === mediaOriginalTitle.toLowerCase()
            ? mediaTitle
            : `${mediaTitle} *(${mediaOriginalTitle})*`
          : mediaOriginalTitle)
        .setURL(`https://www.themoviedb.org/${media.media_type}/${media.id}`)
        .setThumbnail(
          `${images.secure_base_url}/${images.poster_sizes[4]}/${media.poster_path}`
        )
        .addField(listenedMessage.title, Mustache.render(addCommand.success, {
          itemsAddedBy: commandMessage.author.id,
          formattedDate: format(Date.now(), common.formatOfDate)
        }))
      message.channel.send({ embeds: [mediaEmbed] })
    } else {
      mediaEmbed
        .setTitle(listenedMessage.title)
        .setDescription(listenedMessage.foundSimilar.description)
        .addFields(
          {name: "** **", value: "** **"},
          {name: listenedMessage.foundSimilar.searched, value: searchTitle as string, inline: true},
          {
            name: listenedMessage.foundSimilar.found,
            value: `${mediaTitle && mediaOriginalTitle
              ? mediaOriginalTitle.toLowerCase() === mediaTitle.toLowerCase()
                ? mediaOriginalTitle
                : `${mediaOriginalTitle} *(${mediaTitle})*`
              : mediaOriginalTitle}`,
            inline: true
          },
          {name: "** **", value: listenedMessage.foundSimilar.wishToAdd},
          {name: "✅", value: common.confirm, inline: true},
          {name: "❌", value: common.cancel, inline: true}
        )

      const buttonRow = new Discord.MessageActionRow()
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

      message.channel.send({ embeds: [mediaEmbed], components: [buttonRow] })

      const collector = message.channel.createMessageComponentCollector()
      collector.on('collect', async newInteraction => {
        if (newInteraction.customId === 'confirm') {
          server.watchlist.push(mediaObject)
          await server.save()

          mediaEmbed.fields = []
          mediaEmbed
            .setTitle(mediaTitle && mediaOriginalTitle
                ? mediaTitle.toLowerCase() ===
                  mediaOriginalTitle.toLowerCase()
                  ? mediaTitle
                  : `${mediaTitle} *(${mediaOriginalTitle})*`
                : mediaOriginalTitle)
            .setURL(`https://www.themoviedb.org/${media.media_type}/${media.id}`)
            .setThumbnail(`${images.secure_base_url}/${images.poster_sizes[4]}/${media.poster_path}`)
            .setDescription("")
            .addField(listenedMessage.title, addCommand.success)

          await message.edit({ embeds: [mediaEmbed], components: [] })
        } else if (newInteraction.customId === 'cancel') {
          mediaEmbed.fields = []
          mediaEmbed
            .setTitle(listenedMessage.title)
            .setDescription(Mustache.render(listenedMessage.cancelled, [addCommand.name]))

          await message.edit({ embeds: [mediaEmbed], components: [] })
        }
      })
    }
  }
}