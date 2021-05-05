import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import { setBotPresence } from '../bot'
const config = require("../config.json")

export = {
  name: 'prefix',
  aliases: ['setprefix', 'prefixo'],
  description: 'Altera o prefixo dos comandos do bot',
  args: true,
  usage: '<prefixo>',
  execute(message:Discord.Message, args:Array<string>) {
    if (args.length > 1) {
      message.channel.send('Apenas 1 prefixo é permitido!')
      return
    }
    
    if (/[A-Za-z0-9]$/.test(args[0])) {
      config.prefix = args[0] + " "
    } else {
      config.prefix = args[0]
    }
    fs.writeFileSync(path.resolve(__dirname, '../config.json'), JSON.stringify(config, null, 2))
    message.channel.send(`Prefixo alterado para ${args[0]}`)
    setBotPresence()
  }
  
}