import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import Server from '../models/Server'

import { setNewConfig } from '../bot'

import Mustache from 'mustache'

function getLanguages() {
  const availableLanguages = fs.readdirSync(path.resolve(__dirname, '../../languages'))
    .map(language => language.replace(/.json$/, ''))
  
  const languages = availableLanguages.map(language => {
    const { prefixCommand } = require(`../../languages/${language}.json`)
    return {
      [language]: {
        name: prefixCommand.name,
        aliases: prefixCommand.aliases,
        description: prefixCommand.description,
        args: true,
        usage: prefixCommand.usage,
      }
    }
  })

  return languages
}

export = {
  languages: getLanguages(),
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