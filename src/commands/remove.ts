import Discord from 'discord.js'

export = {
  name: 'remove',
  description: 'Remove a media from the watch list.',
  execute(message:Discord.Message, args:Array<string>) {
    message.channel.send('Pong.')
  }
}