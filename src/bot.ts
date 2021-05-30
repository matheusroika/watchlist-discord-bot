import Discord from 'discord.js'

import handleListenedMessage from './handlers/handleListenedMessage'
import Server from './models/Server'
import db from './services/db'

db.connect()
const client = new Discord.Client()
const cron = require('./cron')

import Mustache from 'mustache'

import { Config } from './types/bot'

import commands from './utils/getCommands'
import availableLanguages from './utils/getAvailableLanguages'

async function getGuildsConfig() {
  const configs = await Server.find({}, 'serverId prefix channelToListen language')
  return configs
}

let guildsConfig = (async () => {
  await getGuildsConfig()
})() as unknown as Config[]

export async function setNewConfig(
  configType: 'prefix' | 'channelToListen' | 'language',
  newConfig: string,
  message: Discord.Message
) {

  const config = guildsConfig.find(guild => guild.serverId === message.guild?.id)
  if (config) config[configType] = newConfig
}

async function checkGuildsConfig(message: Discord.Message) {
  if (Array.isArray(guildsConfig)) {
    if (!guildsConfig.some(guild => guild.serverId === message.guild?.id)) {
      guildsConfig = await getGuildsConfig()
    }
  } else {
    guildsConfig = await getGuildsConfig()
  }
}

client.once('ready', async () => {
	console.log('Bot is ready!')
})

client.on("guildCreate", async guild => {
  const serverCheck = await Server.findOne({serverId: guild.id})
  if (serverCheck) return
  
  const locale = availableLanguages.find(language => language === guild.preferredLocale || language.startsWith(guild.preferredLocale))
   || 'en-US'

  const server = {
    serverId: guild.id,
    prefix: ".",
    language: locale
  }

  const newServer = new Server(server)
  await newServer.save()
  
  guildsConfig = await getGuildsConfig()
})

client.on("messageUpdate", async (oldMessage, newMessage) => {
  await checkGuildsConfig(oldMessage as Discord.Message)

  const config = guildsConfig.find(guild => guild.serverId === oldMessage.guild?.id)

  if (oldMessage.channel.id === config?.channelToListen) {
    handleListenedMessage(newMessage as Discord.Message, config)
  }
})

client.on("message", async message => {
  await checkGuildsConfig(message)

  const config = guildsConfig.find((guild: any) => guild.serverId === message.guild?.id)
  if (!config?.language) return
  
  const languageFile = require(`../languages/${config.language}.json`)

  if (message.author.bot) return
  if (message.channel.id === config.channelToListen) {
    handleListenedMessage(message, config)
  }
  if (!message.content.startsWith(config.prefix)) return
  
  const commandBody = message.content.slice(config.prefix.length)
  const commandArgs = commandBody.split(' ')
  const commandName = commandArgs.shift()?.toLowerCase()
  
  const command = commands.get(config.language)?.get(commandName as string)
    || commands.get(config.language)?.find(command => command.aliases && command.aliases.includes(commandName as string))

  if (!command) return

  if (command.args && !commandArgs.length) {
    let reply = languageFile.bot.commandArgs;
  
    if (command.usage) {
      reply += Mustache.render(languageFile.bot.commandArgsUsage, {
        configPrefix: config.prefix,
        commandName: command.name,
        commandUsage: command.usage,
      });
    }
  
    return message.channel.send(reply);
  }

  try {
    if (command.name === languageFile.helpCommand.name || languageFile.helpCommand.aliases.includes(command.name)) {
      command.execute(message, commandArgs, config, commands)
      return
    }

    command.execute(message, commandArgs, config)
  } catch (error) {
    console.error(error)
  }
})

client.login(process.env.BOT_TOKEN)