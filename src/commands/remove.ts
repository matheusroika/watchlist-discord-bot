import Discord from 'discord.js'

import Server from '../model/Server'

import { Config } from '../bot'
const { images } = require("../../cache/imagesCache.json")

import Mustache from 'mustache'
const { removeCommand, common } = require('../../languages/pt-BR.json')

export = {
  name: removeCommand.name,
  aliases: removeCommand.aliases,
  description: removeCommand.description,
  args: true,
  usage: removeCommand.usage,
  async execute(message:Discord.Message, args:Array<string>, { prefix }:Config) {
    const server = await Server.findOne({serverId: message.guild?.id}, 'watchlist')
    const { watchlist } = server
    const commandMessage = message
    const titleToRemove = normalizeString(args.join(" "))
    let removeIndex = 0
    const removeList:any = []
    const removeEmbed = new Discord.MessageEmbed()

    if(!watchlist.length) {
      removeEmbed
        .setTitle(removeCommand.title)
        .setDescription(Mustache.render(removeCommand.emptyError, [prefix]))
      return message.channel.send(removeEmbed)
    }

    function normalizeString(string:string) {
      return string.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
    }

    for (const media of watchlist) {
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
      return message.channel.send(removeEmbed)
    } else {
      sendRemoveEmbed()
    }

    async function sendRemoveEmbed(previousMessage?:Discord.Message) {
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
          {name: '✅', value: common.add, inline: true},
          {name: '❌', value: common.cancel, inline: true},
          {name: '** **', value: '** **'},
        )
        .setFooter(Mustache.render(removeCommand.pagination, {
          removeIndex: removeIndex + 1,
          removeListLength: removeList.length
        }))
      
      const removeMessage = (previousMessage) ? previousMessage : await message.channel.send(removeEmbed)
      if (previousMessage) {
        removeMessage.reactions.removeAll()
        removeMessage.edit(removeEmbed)
      }

      if (removeIndex > 0) removeMessage.react('◀️') 
      if (removeIndex < removeList.length - 1) removeMessage.react('▶️')
      removeMessage.react('✅')
      removeMessage.react('❌')

      const filter = (reaction:Discord.MessageReaction, user:Discord.User) => ['◀️', '▶️', '❌', '✅'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

      removeMessage.awaitReactions(filter, { max: 1, time: 60000 })
        .then(async collected => {
          const reaction = collected.first()

          if (reaction?.emoji.name === '◀️') {
            if (removeIndex > 0) --removeIndex
            sendRemoveEmbed(removeMessage)
          } else if (reaction?.emoji.name === '▶️') {
            if (removeIndex < removeList.length - 1) ++removeIndex
            sendRemoveEmbed(removeMessage)
          } else if (reaction?.emoji.name === '✅') {
            removeEmbed.fields = []
            removeEmbed
              .setDescription('')
              .setFooter('')
              .addField(removeCommand.title, removeCommand.success)
            server.watchlist = watchlist.filter((media:any) => media !== removeMedia)
            await server.save()

            removeMessage.reactions.removeAll()
            removeMessage.edit(removeEmbed)
          } else {
            removeEmbed.fields = []
            removeEmbed
              .setTitle(removeCommand.title)
              .setDescription(removeCommand.cancelled)
              .setURL('')
              .setThumbnail('')
              .setFooter('')
            removeMessage.reactions.removeAll()
            removeMessage.edit(removeEmbed)
          }
        })
        .catch(error => {
          console.error(error)
          removeEmbed.fields = []
          removeEmbed
            .setTitle(removeCommand.title)
            .setDescription(removeCommand.cancelled)
            .setURL('')
            .setThumbnail('')
            .setFooter('')
          removeMessage.reactions.removeAll()
          removeMessage.edit(removeEmbed)
        })
    }
  }
}