import Discord from 'discord.js'

import Server from '../models/Server'

import { setNewConfig } from '../bot'
import { LanguageFile } from '../types/bot'

import Mustache from 'mustache'
import getLanguages from '../utils/getLanguages'


export = {
  languages: getLanguages('channelCommand', false, true),
  async execute(message: Discord.Message, args: Array<string>) {
    const config = await Server.findOne({serverId: message.guild?.id}, 'prefix channelToListen language')
    const { channelCommand }: LanguageFile = require(`../../languages/${config.language}.json`)

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
    setNewConfig('channelToListen', config.channelToListen, message)
    message.channel.send(Mustache.render(channelCommand.success, [args[0]]))
  }
}