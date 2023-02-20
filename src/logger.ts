
import { config } from './config'

const winston = require('winston')

export const logger = winston.createLogger({
  level: config.logLevel,
  transports: [
    new winston.transports.Console({
      format: ( config.logLevel == "debug" )
        ? winston.format.combine( winston.format.json(), winston.format.prettyPrint() )
        : winston.format.json()
    })
  ]
})

