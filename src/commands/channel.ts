import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import Server from '../model/Server'

import { setNewConfig } from '../bot'

import Mustache from 'mustache'

function getLanguages() {
  const availableLanguages = fs.readdirSync(path.resolve(__dirname, '../../languages'))
    .map(language => language.replace(/.json$/, ''))
  
  const languages = availableLanguages.map(language => {
    const { channelCommand } = require(`../../languages/${language}.json`)
    return {
      [language]: {
        name: channelCommand.name,
        aliases: channelCommand.aliases,
        description: channelCommand.description,
        usage: channelCommand.usage,
      }
    }
  })

  return languages
}

export = {
  languages: getLanguages(),
  async execute(message:Discord.Message, args:Array<string>) {
    const config = await Server.findOne({serverId: message.guild?.id}, 'prefix channelToListen language')
    const { channelCommand } = require(`../../languages/${config.language}.json`)

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