import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import Server from '../models/Server'

import { setNewConfig } from '../bot'
import { LanguageFile } from '../types/bot'

import Mustache from 'mustache'
import getLanguages from '../utils/getLanguages'


export = {
  languages: getLanguages('languageCommand', true, true),
  async execute(message: Discord.Message, args: Array<string>) {
    const config = await Server.findOne({serverId: message.guild?.id}, 'language')
    const { languageCommand }: LanguageFile = require(`../../languages/${config.language}.json`)
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