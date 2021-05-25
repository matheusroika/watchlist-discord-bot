import mongoose from 'mongoose'

const dbUri = process.env.DB_URI

const dbConnection = {
  async connect() {
    try {
      await mongoose.connect(dbUri as string, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      })
      console.log('Connected to MongoDB')
    } catch {
      console.log('/services/db.ts connect error')
    }
  },

  async disconnect() {
    try {
      await mongoose.disconnect()
      console.log('Disconnected from MongoDB')
    } catch {
      console.log('/services/db.ts disconnect error')
    }
  }
}

export default dbConnection