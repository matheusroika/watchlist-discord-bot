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
    const { languageCommand } = require(`../../languages/${language}.json`)
    return {
      [language]: {
        name: languageCommand.name,
        aliases: languageCommand.aliases,
        description: languageCommand.description,
        args: true,
        usage: languageCommand.usage,
      }
    }
  })
  
  return languages
}

export = {
  languages: getLanguages(),
  async execute(message:Discord.Message, args:Array<string>) {
    const config = await Server.findOne({serverId: message.guild?.id}, 'language')
    const { languageCommand } = require(`../../languages/${config.language}.json`)
    const availableLanguages = fs.readdirSync(path.resolve(__dirname, '../../languages'))
      .map(language => language.replace(/.json$/, ''))

    if (args.length > 1) {
      message.channel.send(languageCommand.onlyOne)
      return
    }
    
    if (availableLanguages.includes(args[0])) {
      config.language = args[0]
    } else {
      message.channel.send(Mustache.render(languageCommand.languagesAvailable, [availableLanguages.join(', ')]))
      return
    }

    await config.save()
    setNewConfig('language', config.language, message)
    const languageImport = require(`../../languages/${config.language}.json`)
    message.channel.send(Mustache.render(languageImport.languageCommand.success, [args[0]]))
  }
}