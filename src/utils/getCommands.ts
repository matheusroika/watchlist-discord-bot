import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import availableLanguages from './getAvailableLanguages'

import { Command, CommandByLanguages } from '../types/bot'

const commandsByLanguage = new Discord.Collection<string, Discord.Collection<string, Command>>()

const commandFiles = fs.readdirSync(path.resolve(__dirname, '../commands')).filter(file => /\.(j|t)s$/.test(file))

availableLanguages.forEach(availableLanguage => {
  const commands = new Discord.Collection<string, Command>()

  commandFiles.forEach(file => {
    const commandFile: CommandByLanguages = require(`../commands/${file}`)
    
    commandFile.getCommand().forEach(command => {
      let languageIndex = 0

      const languageName = Object.keys(command)[languageIndex]
      const commandObject = Object.values(command)[languageIndex]

      if (languageName === availableLanguage) {
        const newCommand = {
          ...commandObject,
          execute: commandFile.execute,
        }

        commands.set(newCommand.data.name, newCommand)
      }

      languageIndex++
    })
  })
  
  commandsByLanguage.set(availableLanguage, commands)
})

export default commandsByLanguage