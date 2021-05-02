import Discord from 'discord.js'

const watchList = require('../watch-list.json')
const imagesCache = require('../services/images-cache.json')

export = {
  name: 'random',
  description: 'Select a random movie from the watch list.',
  execute(message, args) {
    const commandMessage = message
    const argsList = args.join(' ').split('+')

    async function sendMovieEmbed(previousMessage?) {
      function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
      }

      function normalizeString(string) {
        return string.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
      }

      function getAvailableGenres() {
        let availableGenres = []
        for (const movie of watchList) {
          availableGenres = availableGenres.concat(movie.genres)
        }
        return availableGenres
      }

      const randomIndex = getRandomInt(0, watchList.length)
      const movie = watchList[randomIndex]

      if (args.length) {
        const argsGenres = argsList.map(genre => normalizeString(genre))
        const availableGenres = getAvailableGenres().map(genre => normalizeString(genre))
        const movieGenres = movie.genres.map(genre => normalizeString(genre))
        
        if (!availableGenres.some(genre => argsGenres.includes(genre))) {
          message.channel.send('Gênero de filme não encontrado. Tente novamente.')
          return
        }

        if (!movieGenres.some(genre => argsGenres.includes(genre))) {
          if (previousMessage) {
            sendMovieEmbed(previousMessage)
          } else {
            sendMovieEmbed()
          }

          return
        }
      }

      const movieEmbed = new Discord.MessageEmbed()
        .setTitle(
          (movie.title)
            ? (movie.title == movie.original_title)
              ? movie.title
              : `${movie.title} *(${movie.original_title})*`
            : movie.original_title
        )
        .setURL(`https://www.themoviedb.org/${movie.media_type}/${movie.id}`)
        .setDescription(movie.description)
        .setThumbnail(`${imagesCache.images.secure_base_url}/${imagesCache.images.poster_sizes[4]}/${movie.poster_path}`)
        .addFields(
          {name: '\u200B', value: '\u200B'},
          {name: '✅', value: 'Escolher esse', inline: true},
          {name: '🔁', value: 'Outro', inline: true},
        )

        const movieMessage = previousMessage ? previousMessage : await message.channel.send(movieEmbed)
        if (previousMessage) {
          movieMessage.reactions.removeAll()
          movieMessage.edit(movieEmbed)
        } 
        movieMessage.react('✅')
        movieMessage.react('🔁')

        const filter = (reaction, user) => ['✅', '🔁'].includes(reaction.emoji.name) && user.id === commandMessage.author.id

        movieMessage.awaitReactions(filter, { max: 1, time: 60000 })
          .then(async collected => {
            const reaction = collected.first()

            if (reaction.emoji.name === '✅') {
              movieEmbed.fields = []
              movieMessage.edit(movieEmbed)
              movieMessage.reactions.removeAll()
              return
            } else {
              sendMovieEmbed(movieMessage)
            }
          })
          .catch(error => {
            console.error(error)
            movieEmbed.fields = []
            movieMessage.edit(movieEmbed)
            movieMessage.reactions.removeAll()
          })
    }

    sendMovieEmbed()
  }
}