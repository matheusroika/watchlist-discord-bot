export interface Config {
  serverId: string;
  prefix: string;
  channelToListen: string | null;
  language: string;
}

export interface Language {
  name: string;
  aliases: Array<string>;
  description: string;
  args?: boolean;
  usage?: string;
}

export interface LanguageObject {
  [key: string]: Language[]
}