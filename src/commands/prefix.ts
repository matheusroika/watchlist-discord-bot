import Discord from 'discord.js'

import Server from '../model/Server'

import { setNewPrefix } from '../bot'

import Mustache from 'mustache'
const { prefixCommand } = require('../../languages/pt-BR.json')

export = {
  name: prefixCommand.name,
  aliases: prefixCommand.aliases,
  description: prefixCommand.description,
  args: true,
  usage: prefixCommand.usage,
  async execute(message:Discord.Message, args:Array<string>) {
    const config = await Server.findOne({serverId: message.guild?.id}, 'prefix channelToListen')

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
    setNewPrefix(config.prefix)
    message.channel.send(Mustache.render(prefixCommand.success, [args[0]]))
  }
  
}