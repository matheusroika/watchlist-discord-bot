import Discord from 'discord.js'

export = {
  name: 'ping',
  description: 'Ping!',
  execute(message:Discord.Message, args:Array<string>) {
    message.channel.send('Pong.')
  }
}