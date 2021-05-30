import Discord from 'discord.js'

import Server from '../models/Server'

import { setNewConfig } from '../bot'

import Mustache from 'mustache'
import getLanguages from '../utils/getLanguages'

export = {
  languages: getLanguages('prefixCommand', true, true),
  async execute(message:Discord.Message, args:Array<string>) {
    const config = await Server.findOne({serverId: message.guild?.id}, 'prefix channelToListen language')
    const { prefixCommand } = require(`../../languages/${config.language}.json`)

    if (args.length > 1) {
      message.channel.send(prefixCommand.onlyOne)
      return
    }
    
    if (/[A-Za-z0-9]$/.test(args[0])) {
      config.prefix = args[0] + " "
    } else {
      config.prefix = args[0]
    }
    await config.save()
    setNewConfig('prefix', config.prefix, message)
    message.channel.send(Mustache.render(prefixCommand.success, [args[0]]))
  }
  
}