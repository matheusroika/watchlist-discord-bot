import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import imagesCache from './services/images-cache'
import genresCache from './services/genres-cache'
import handleListenedMessage from './utils/handleListenedMessage'
const { prefix, ...config } = require("./config.json")

const client = new Discord.Client()
const commands = new Discord.Collection()

export async function setBotPresence() {
  const channelToListen:any = (config.channelToListen) ? await client.channels.fetch(config.channelToListen) : undefined

  client.user?.setPresence({
    status: 'online',
    activity: {
      name: (channelToListen) ? `#${channelToListen.name} | ${prefix}help` : `${prefix}help`,
      type: "LISTENING",
    }
  })
}

client.once('ready', async () => {
	console.log('Bot is ready!')
  setBotPresence()
})

const commandFiles = fs.readdirSync(path.resolve(__dirname, './commands')).filter(file => file.endsWith('.ts'))
for (const file of commandFiles) {
  const command = require(`./commands/${file}`)
  commands.set(command.name, command)
}

client.on("messageUpdate", (oldMessage, newMessage) => {
  if (oldMessage.channel.id === config.channelToListen) {
    handleListenedMessage(newMessage as Discord.Message)
  }
})

client.on("message", message => {
  if (message.author.bot) return
  if (message.channel.id === config.channelToListen) {
    handleListenedMessage(message)
  }
  if (!message.content.startsWith(prefix)) return
  
  const commandBody = message.content.slice(prefix.length)
  const commandArgs = commandBody.split(' ')
  const commandName = commandArgs.shift()?.toLowerCase()

  const command:any = commands.get(commandName)
    || commands.find((command:any) => command.aliases && command.aliases.includes(commandName))

  if (!command) return

  if (command.args && !commandArgs.length) {
    let reply = 'Esse comando requer argumentos!';
  
    if (command.usage) {
      reply += `\nVocê deve usá-lo dessa maneira: \`${prefix}${command.name} ${command.usage}\``;
    }
  
    return message.channel.send(reply);
  }

  try {
    if (command.name === 'help') {
      command.execute(message, commandArgs, commands)
      return
    }
    command.execute(message, commandArgs)
  } catch (error) {
    console.error(error)
  }
})

async function getCache() {
  await imagesCache()
  await genresCache()
}

//getCache()

client.login(process.env.BOT_TOKEN)