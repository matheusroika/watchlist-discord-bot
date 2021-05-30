import Discord from 'discord.js'

import handleListenedMessage from './utils/handleListenedMessage'
import Server from './models/Server'
import db from './services/db'

db.connect()
const client = new Discord.Client()
const cron = require('./cron')

import Mustache from 'mustache'

import { Config } from './types/bot'

import commands from './utils/getCommands'
import availableLanguages from './utils/getAvailableLanguages'

let languageFile: any

async function getGuildsConfig() {
  const configs = await Server.find({}, 'serverId prefix channelToListen language')
  return configs
}

let guildsConfig = (async () => {
  await getGuildsConfig()
})() as unknown as Config[]


export async function setNewConfig(
  configType: 'prefix' | 'channelToListen' | 'language',
  configParam: string,
  message: Discord.Message
) {

  const config = guildsConfig.find(guild => guild.serverId === message.guild?.id)
  if (config) config[configType] = configParam
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
  if (Array.isArray(guildsConfig)) {
    if (!guildsConfig.some(guild => guild.serverId === oldMessage.guild?.id)) {
      guildsConfig = await getGuildsConfig()
    }
  } else {
    guildsConfig = await getGuildsConfig()
  }

  const config = guildsConfig.find(guild => guild.serverId === oldMessage.guild?.id)

  if (oldMessage.channel.id === config?.channelToListen) {
    handleListenedMessage(newMessage as Discord.Message, config)
  }
})

client.on("message", async message => {
  if (Array.isArray(guildsConfig)) {
    if (!guildsConfig.some(guild => guild.serverId === message.guild?.id)) {
      guildsConfig = await getGuildsConfig()
    }
  } else {
    guildsConfig = await getGuildsConfig()
  }

  const config = guildsConfig.find((guild: any) => guild.serverId === message.guild?.id)
  if (!config?.language) return
  
  languageFile = require(`../languages/${config.language}.json`)

  if (message.author.bot) return
  if (message.channel.id === config.channelToListen) {
    handleListenedMessage(message, config)
  }
  if (!message.content.startsWith(config.prefix)) return
  
  const commandBody = message.content.slice(config.prefix.length)
  const commandArgs = commandBody.split(' ')
  const commandName = commandArgs.shift()?.toLowerCase()
  
  const command:any = commands.get(config.language)?.find(command => command.name === commandName)
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
      command.execute(message, commandArgs, commands, config)
      return
    }

    command.execute(message, commandArgs, config)
  } catch (error) {
    console.error(error)
  }
})

client.login(process.env.BOT_TOKEN)