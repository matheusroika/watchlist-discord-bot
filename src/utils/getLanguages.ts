import fs from 'fs'
import path from 'path'

export default function getLanguages(name: string, args: boolean, usage: boolean) {
  const availableLanguages = fs.readdirSync(path.resolve(__dirname, '../../languages'))
    .map(language => language.replace(/.json$/, ''))
  
  const languages = availableLanguages.map(language => {
    const command = require(`../../languages/${language}.json`)
    return {
      [language]: {
        name: command[name].name,
        aliases: command[name].aliases,
        description: command[name].description,
        ...(args ? {args: true} : {} ),
        ...(usage ? {usage: command[name].usage} : {}),
      }
    }
  })

  return languages
}