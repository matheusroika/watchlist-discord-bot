import mongoose from 'mongoose'

const serverSchema = new mongoose.Schema({
  serverId: String,
  channelToListen: {type: String, default: null},
  language: String,
  watchlist: [
    {
      id: Number,
      title: String,
      original_title: String,
      genres: [String],
      media_type: String,
      description: String,
      poster_path: String,
      addedAt: Number,
      addedBy: {
        id: String,
        username: String,
        bot: Boolean,
        createdTimestamp: Number,
        tag: String,
        displayAvatarURL: String
      }
    }
  ],
  watched: [
    {
      id: Number,
      title: String,
      original_title: String,
      genres: [String],
      media_type: String,
      description: String,
      poster_path: String,
      addedAt: Number,
      addedBy: {
        id: String,
        username: String,
        bot: Boolean,
        createdTimestamp: Number,
        tag: String,
        displayAvatarURL: String
      },
      watchedAt: Number,
      watchedBy: {
        id: String,
        username: String,
        bot: Boolean,
        createdTimestamp: Number,
        tag: String,
        displayAvatarURL: String
      }
    }
  ]
})

const Server = mongoose.model('Server', serverSchema)
export default Server