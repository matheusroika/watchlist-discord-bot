import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

import Server from '../models/Server'
import commands from '../utils/getCommands'

import { Config } from '../types/bot'

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN as string)

export default async function deployCommands(guildList: Array<string>) {
  const guildConfigs: Config[] = await Server.find({}, 'serverId channelToListen language')
  
  guildConfigs.forEach(guildConfig => {
    if (guildList.some(guildId => guildId === guildConfig.serverId)){
      const { language } = guildConfig

      const guildCommands = commands.get(language)
      const restCommands = guildCommands?.map(command => {
        return command.data.toJSON()
      })

      rest.put(
        Routes.applicationGuildCommands(process.env.BOT_ID as string, 
          guildConfig.serverId) as unknown as '/`${string}`', 
          { body: restCommands }
      )
        .then(() => console.log('Successfully registered application commands.'))
        .catch(err => console.error(err))
    }
  })
}