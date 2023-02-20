
require('dotenv').config()

export class Config {

  static get logLevel () : string {
    return ( process.env.LOG_LEVEL || 'info' ).toLowerCase()
  }

  static get isDryRun() : boolean {
    return !! process.env.IS_DRYRUN
      ? true
      : false
  }

  static get useENVAWSCredenentials() : boolean {
    return !! process.env.USE_ENV_AWS_CREDENTIALS
      ? true
      : false
  }

  //
  //
  //

  static get isTestMode() : boolean {
    return !! process.env.TEST_MODE
      ? true
      : false
  }

  static get minimumHighScore() : number {
    return !! parseInt( process.env.MINIMUM_HIGH_SCORE || '' )
      ? parseInt( process.env.MINIMUM_HIGH_SCORE || '' )
      : 2
  }

}

export const config = Config
