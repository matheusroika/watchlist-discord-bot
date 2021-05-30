import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import { Language, LanguageObject } from '../types/bot'
import availableLanguages from './getAvailableLanguages'

const commands = new Discord.Collection<string, Language[]>()

const commandFiles = fs.readdirSync(path.resolve(__dirname, './commands')).filter(file => file.endsWith('.ts'))

function getLanguageObject() {
  const languages: LanguageObject = {}

  availableLanguages.forEach(language => {
    languages[language] = []
  })

  return languages
}

const languageObject = getLanguageObject()

availableLanguages.forEach(language => {
  commandFiles.forEach(file => {
    const command = require(`./commands/${file}`)
    
    command.languages.forEach((language: Language) => {
      const newCommand = {
        ...Object.values(language)[0],
        execute: command.execute
      }

      languageObject[Object.keys(language)[0]].push(newCommand)
    })
  })

  commands.set(language, languageObject[language])
})

export default commands