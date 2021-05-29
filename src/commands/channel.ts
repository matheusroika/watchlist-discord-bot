import Discord from 'discord.js'

import Server from '../model/Server'

import { setNewChannel } from '../bot'

import Mustache from 'mustache'
const { channelCommand } = require('../../languages/pt-BR.json')

export = {
  name: channelCommand.name,
  aliases: channelCommand.aliases,
  description: channelCommand.description,
  usage: channelCommand.usage,
  async execute(message:Discord.Message, args:Array<string>) {
    const config = await Server.findOne({serverId: message.guild?.id}, 'prefix channelToListen')

    if (args.length > 1) {
      message.channel.send(channelCommand.onlyOne)
      return
    }

    if (args.length == 0) {
      if (!config.channelToListen) {
        message.channel.send(Mustache.render(channelCommand.monitoringInstructions, [config.prefix]))
      } else {
        message.channel.send(Mustache.render(channelCommand.stopMonitoring, [config.channelToListen]))
        config.channelToListen = null
        await config.save()
      }
      
      return
    }

    if (!/^<#.*>$/.test(args[0])) {
      message.channel.send(Mustache.render(channelCommand.tagChannel, [config.prefix]))
      return
    }
    
    const normalizedChannel = args[0].replace(/^<#|>$/g, '')

    if (normalizedChannel === config.channelToListen) {
      message.channel.send(Mustache.render(channelCommand.alreadyMonitoring, [args[0]]))
      return
    }

    config.channelToListen = normalizedChannel
    await config.save()
    setNewChannel(config.channelToListen)
    message.channel.send(Mustache.render(channelCommand.success, [args[0]]))
  }
}