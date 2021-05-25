import Discord from 'discord.js'

import Server from '../model/Server'

import { setNewChannel } from '../bot'

export = {
  name: 'channel',
  aliases: ['setchannel', 'canal'],
  description: 'Define o canal que será monitorado. Embeds URL nesse canal serão adicionados a watch list',
  usage: '<#canal>',
  async execute(message:Discord.Message, args:Array<string>) {
    const config = await Server.findOne({serverId: message.guild?.id}, 'prefix channelToListen')

    if (args.length > 1) {
      message.channel.send('Apenas 1 canal pode ser monitorado por vez!')
      return
    }

    if (args.length == 0) {
      if (!config.channelToListen) {
        message.channel.send(`Para monitorar um canal, digite \`${config.prefix}channel <#canal>\``)
      } else {
        message.channel.send(`Parando de monitorar canal <#${config.channelToListen}>`)
        config.channelToListen = null
        await config.save()
      }
      
      return
    }

    if (!/^<#.*>$/.test(args[0])) {
      message.channel.send(`Você precisa marcar o canal que quer monitorar! (Exemplo: \`${config.prefix}channel #canal\`)`)
      return
    }
    
    const normalizedChannel = args[0].replace(/^<#|>$/g, '')
    config.channelToListen = normalizedChannel
    await config.save()
    setNewChannel(config.channelToListen)
    message.channel.send(`Monitorando canal ${args[0]}`)
  }
}