import cors from 'cors'
import express from 'express'

export const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(express.urlencoded())
