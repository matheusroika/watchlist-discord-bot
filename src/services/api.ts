import axios from 'axios'

export const api = axios.create({
  baseURL: "https://api.themoviedb.org/3/",
  headers: {'Authorization': `Bearer ${process.env.TMDB_TOKEN}`},
})