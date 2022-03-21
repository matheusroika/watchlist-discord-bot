import Discord from 'discord.js'

import handleListenedMessage from './handlers/handleListenedMessage'
import Server from './models/Server'
import db from './services/db'

const generateCaches = require('./utils/generateCaches')
import commands from './utils/getCommands'
import availableLanguages from './utils/getAvailableLanguages'
import deployCommands from './utils/deployCommands'

import { Config } from './types/bot'
type InteractionOrMessage = Discord.CommandInteraction | Discord.Message

db.connect()
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] })

async function getGuildsConfig() {
  const configs = await Server.find({}, 'serverId channelToListen language')
  return configs as Config[]
}

let guildsConfig: Config[]
getGuildsConfig()
  .then(configs => {
    guildsConfig = configs
  })
  .catch(err => {
    console.error('Error loading Guilds configs: ' + err)
  })

export async function setNewConfig(
  configType: 'channelToListen' | 'language',
  newConfig: string,
  interaction: Discord.CommandInteraction
) {
  const config = guildsConfig.find(guild => guild.serverId === interaction.guildId)
  if (!config) await checkGuildsConfig(interaction)
  if (config) config[configType] = newConfig
  if (configType === 'language') await deployCommands([config?.serverId as string])
}

async function checkGuildsConfig(interaction: InteractionOrMessage) {
  if (Array.isArray(guildsConfig)) {
    if (!guildsConfig.some(guild => guild.serverId === interaction.guildId)) {
      guildsConfig = await getGuildsConfig()
    }
  } else {
    guildsConfig = await getGuildsConfig()
  }
}

client.once('ready', async () => {
	console.log('Bot is ready!')
  const guildList = client.guilds.cache.map(guild => {
    return guild.id
  })

  await deployCommands(guildList)
})

client.on("guildCreate", async guild => {
  const serverCheck = await Server.findOne({serverId: guild.id})
  if (serverCheck) return
  
  const locale = availableLanguages.find(language => language === guild.preferredLocale
    || language.startsWith(guild.preferredLocale))
    || 'en-US'

  const server = {
    serverId: guild.id,
    language: locale
  }

  const newServer = new Server(server)
  await newServer.save()
  
  guildsConfig = await getGuildsConfig()
})

client.on("messageCreate", async message => {
  await checkGuildsConfig(message)
  const config = guildsConfig.find(guild => guild.serverId === message.guildId)
  if (!config) return

  if(message.channelId === config.channelToListen) {
    handleListenedMessage(message, config)
  }
})

client.on("messageUpdate", async (oldMessage, newMessage) => {
  await checkGuildsConfig(oldMessage as Discord.Message)
  const config = guildsConfig.find(guild => guild.serverId === oldMessage.guildId)
  if (!config) return

  if (oldMessage.channelId === config.channelToListen) {
    handleListenedMessage(newMessage as Discord.Message, config)
  }
})

client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return

  await checkGuildsConfig(interaction)
  const config = guildsConfig.find(guild => guild.serverId === interaction.guildId)
  if (!config) return

  const command = commands.get(config.language)?.get(interaction.commandName)
  if (!command) return

  try {
    await command.execute(interaction, config)
  } catch (err) {
    console.error('Error executing command: ' + command.data.name)
    console.error(err)
    await interaction.reply({ content: '**Erro**', ephemeral: true })
  }
})

client.login(process.env.BOT_TOKEN)