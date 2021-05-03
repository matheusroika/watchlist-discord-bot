import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

const config = require("../config.json")

export = {
  name: 'prefix',
  description: 'Change the bot prefix.',
  execute(message:Discord.Message, args:Array<string>) {
    if (args.length > 1) {
      message.channel.send('Apenas 1 prefixo é permitido!')
      return
    }
    if (args.length == 0) {
      message.channel.send(`Para alterar o prefixo, digite ${config.commandPrefix}prefix \`novo prefixo\`.`)
      return
    }
    
    if (/[A-Za-z0-9]$/.test(args[0])) {
      config.commandPrefix = args[0] + " "
    } else {
      config.commandPrefix = args[0]
    }
    fs.writeFileSync(path.resolve(__dirname, '../config.json'), JSON.stringify(config, null, 2))
    message.channel.send(`Prefixo alterado para ${args[0]}`)
  }
  
}