import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import handleListenedMessage from './utils/handleListenedMessage'
import Server from './model/Server'
import db from './services/db'

const client = new Discord.Client()
const commands = new Discord.Collection()

export interface Config {
  prefix: string;
  channelToListen: string | null;
}

let config: Config

export async function setNewPrefix(prefix:string) {
  config.prefix = prefix
}

export async function setNewChannel(channel:string) {
  config.channelToListen = channel
}

client.once('ready', async () => {
  await db.connect()
	console.log('Bot is ready!')
})

const commandFiles = fs.readdirSync(path.resolve(__dirname, './commands')).filter(file => file.endsWith('.ts'))
for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  commands.set(command.name, command)
}

client.on("guildCreate", async guild => {
  const serverCheck = await Server.findOne({serverId: guild.id})
  if (serverCheck) return

  const server = {
    serverId: guild.id,
    prefix: ".",
  }

  const newServer = new Server(server)
  await newServer.save()
})

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!config) {
    config = await Server.findOne({serverId: oldMessage.guild?.id}, 'prefix channelToListen')
  }
  if (oldMessage.channel.id === config.channelToListen) {
    handleListenedMessage(newMessage as Discord.Message, config)
  }
})

client.on("message", async message => {
  if (!config) {
    config = await Server.findOne({serverId: message.guild?.id}, 'prefix channelToListen')
  }
  if (message.author.bot) return
  if (message.channel.id === config.channelToListen) {
    handleListenedMessage(message, config)
  }
  if (!message.content.startsWith(config.prefix)) return
  
  const commandBody = message.content.slice(config.prefix.length)
  const commandArgs = commandBody.split(' ')
  const commandName = commandArgs.shift()?.toLowerCase()

  const command:any = commands.get(commandName)
    || commands.find((command:any) => command.aliases && command.aliases.includes(commandName))

  if (!command) return

  if (command.args && !commandArgs.length) {
    let reply = 'Esse comando requer argumentos!';
  
    if (command.usage) {
      reply += `\nVocê deve usá-lo dessa maneira: \`${config.prefix}${command.name} ${command.usage}\``;
    }
  
    return message.channel.send(reply);
  }

  try {
    if (command.name === 'help') {
      command.execute(message, commandArgs, commands, config)
      return
    }
    command.execute(message, commandArgs, config)
  } catch (error) {
    console.error(error)
  }
})

client.login(process.env.BOT_TOKEN)