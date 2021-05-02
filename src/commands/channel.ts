import fs from 'fs'
import path from 'path'

const config = require("../config.json")

export = {
  name: 'channel',
  description: 'Set channel for bot to listen to.',
  execute(message, args) {
    if (args.length > 1) {
      message.channel.send('Apenas 1 canal pode ser monitorado por vez!')
      return
    }

    if (args.length == 0) {
      if (!config.channelToListen) {
        message.channel.send(`Para monitorar um canal, digite ${config.commandPrefix}channel \`#canal\`.`)
      } else {
        message.channel.send(`Parando de monitorar canal <#${config.channelToListen}>`)
        delete config.channelToListen
        fs.writeFileSync(path.resolve(__dirname, '../config.json'), JSON.stringify(config, null, 2))
      }
      
      return
    }

    if (!/^<#.*>$/.test(args[0])) {
      message.channel.send(`Você precisa marcar o canal que quer monitorar! (Exemplo: ${config.commandPrefix}channel \`#canal\`)`)
      return
    }
    
    const normalizedChannel = args[0].replace(/^<#|>$/g, '')
    config.channelToListen = normalizedChannel
    fs.writeFileSync(path.resolve(__dirname, '../config.json'), JSON.stringify(config, null, 2))
    message.channel.send(`Monitorando canal ${args[0]}`)
  }
}