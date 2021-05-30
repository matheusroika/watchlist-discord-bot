import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import { Command, CommandsByLanguages } from '../types/bot'
import availableLanguages from './getAvailableLanguages'

const commandsByLanguage = new Discord.Collection<string, Discord.Collection<string, Command>>()

const commandFiles = fs.readdirSync(path.resolve(__dirname, '../commands')).filter(file => file.endsWith('.ts'))

availableLanguages.forEach(availableLanguage => {
  const commands = new Discord.Collection<string, Command>()

  commandFiles.forEach(file => {
    const command: CommandsByLanguages = require(`../commands/${file}`)
    
    command.languages.forEach(language => {
      let languageIndex = 0
      const languageName = Object.keys(language)[languageIndex]
      const languageObject = Object.values(language)[languageIndex]

      if (languageName === availableLanguage) {
        const newCommand = {
          ...languageObject,
          execute: command.execute
        }

        commands.set(newCommand.name, newCommand)
      }

      languageIndex++
    })
  })
  
  commandsByLanguage.set(availableLanguage, commands)
})

export default commandsByLanguage