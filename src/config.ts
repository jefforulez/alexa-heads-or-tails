
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

  static get ddbTableName() : string {
    return !! process.env.DDB_TABLE_NAME
      ? process.env.DDB_TABLE_NAME
      : 'alexaHeadsOrTails'
  }

  static get ddbTimeToLiveDays() : number {
    return !! parseInt( process.env.DDB_TTL_DAYS || '' )
      ? parseInt( process.env.DDB_TTL_DAYS || '' )
      : 90
  }


}

export const config = Config
