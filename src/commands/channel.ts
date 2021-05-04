import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import { setBotPresence } from '../bot'
const { prefix, ...config } = require("../config.json")

export = {
  name: 'channel',
  aliases: ['setchannel', 'canal'],
  description: 'Define o canal que será monitorado. Embeds URL nesse canal serão adicionados a watch list',
  args: true,
  usage: '<#canal>',
  execute(message:Discord.Message, args:Array<string>) {
    if (args.length > 1) {
      message.channel.send('Apenas 1 canal pode ser monitorado por vez!')
      return
    }

    if (args.length == 0) {
      if (!config.channelToListen) {
        message.channel.send(`Para monitorar um canal, digite ${prefix}channel \`#canal\`.`)
      } else {
        message.channel.send(`Parando de monitorar canal <#${config.channelToListen}>`)
        delete config.channelToListen
        fs.writeFileSync(path.resolve(__dirname, '../config.json'), JSON.stringify(config, null, 2))
        setBotPresence()
      }
      
      return
    }

    if (!/^<#.*>$/.test(args[0])) {
      message.channel.send(`Você precisa marcar o canal que quer monitorar! (Exemplo: \`${prefix}channel #canal\`)`)
      return
    }
    
    const normalizedChannel = args[0].replace(/^<#|>$/g, '')
    config.channelToListen = normalizedChannel
    fs.writeFileSync(path.resolve(__dirname, '../config.json'), JSON.stringify(config, null, 2))
    message.channel.send(`Monitorando canal ${args[0]}`)
    setBotPresence()
  }
}