import fs from 'fs'
import path from 'path'
import Discord from 'discord.js'

import imagesCache from './services/images-cache'
import genresCache from './services/genres-cache'
import handleListenedMessage from './utils/handleListenedMessage'
const config = require("./config.json")

const client = new Discord.Client()
const commands = new Discord.Collection()

client.once('ready', () => {
	console.log('Bot is ready!')
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
  if (!message.content.startsWith(config.commandPrefix)) return
  
  const commandBody = message.content.slice(config.commandPrefix.length)
  const commandArgs = commandBody.split(' ')
  const commandName = commandArgs.shift()?.toLowerCase()

  if (!commands.has(commandName)) return

  try {
    const command:any = commands.get(commandName)
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