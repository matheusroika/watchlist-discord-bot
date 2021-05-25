import Discord from 'discord.js'

import Server from '../model/Server'

import { setNewPrefix } from '../bot'

export = {
  name: 'prefix',
  aliases: ['setprefix', 'prefixo'],
  description: 'Altera o prefixo dos comandos do bot',
  args: true,
  usage: '<prefixo>',
  async execute(message:Discord.Message, args:Array<string>) {
    const config = await Server.findOne({serverId: message.guild?.id}, 'prefix channelToListen')

    if (args.length > 1) {
      message.channel.send('Apenas 1 prefixo é permitido!')
      return
    }
    
    if (/[A-Za-z0-9]$/.test(args[0])) {
      config.prefix = args[0] + " "
    } else {
      config.prefix = args[0]
    }
    await config.save()
    setNewPrefix(config.prefix)
    message.channel.send(`Prefixo alterado para \`${args[0]}\``)
  }
  
}