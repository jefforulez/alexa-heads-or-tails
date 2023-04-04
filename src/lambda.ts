
import { config } from './config'
import { logger } from './logger'

import {
  getRequestType,
  getIntentName,
  isNewSession,
} from 'ask-sdk'

import {
  ErrorHandler,
  HandlerInput,
  RequestHandler,
  SkillBuilders,
  PersistenceAdapter,
} from 'ask-sdk-core'

import {
  Response,
  SessionEndedRequest,
  RequestEnvelope,
} from 'ask-sdk-model'

import {
  MyPersistenceAdapter
} from './persistanceAdapter'


const i18n = require( 'i18next' )
const sprintf = require( 'i18next-sprintf-postprocessor' )

const languageStrings = {
  'en' : require('./i18n/en'),
}

//
//
//

const LaunchRequestHandler: RequestHandler = {
  canHandle( handlerInput: HandlerInput ) : boolean
  {
    return getRequestType( handlerInput.requestEnvelope ) === 'LaunchRequest'
  },
  async handle( handlerInput: HandlerInput ) : Promise<Response>
  {
    const attributesManager = handlerInput.attributesManager

    const sessionAttributes = attributesManager.getSessionAttributes()
    const requestAttributes = attributesManager.getRequestAttributes()
    logger.info( 'LaunchRequestHandler', { sessionAttributes, requestAttributes } )

    // set the game state
    sessionAttributes.gameState = 'LAUNCH'
    sessionAttributes.currentScore = 0
    sessionAttributes.highScore = 0

    // save the session attributes
    attributesManager.setSessionAttributes( sessionAttributes )

    // save the start of the session to ddb
    await persistSessionState( handlerInput, 'STARTED' )

    const speakText = requestAttributes.t( 'LAUNCH_SPEAK' )
    const repromptText = requestAttributes.t( 'LAUNCH_REPROMPT' )
    const cardTitle = requestAttributes.t( 'CARD_TITLE' )
    const cardText = requestAttributes.t( 'LAUNCH_CARD_TEXT' )

    return handlerInput.responseBuilder
      .speak( speakText )
      .reprompt( repromptText )
      .withSimpleCard( cardTitle, cardText )
      .getResponse()
  },
}

const FlipIntentHandler: RequestHandler = {
  canHandle( handlerInput: HandlerInput )
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()

    if (
      isNewSession( handlerInput.requestEnvelope ) // "alexa, tell heads or tails to flip"
      || sessionAttributes.gameState == 'LAUNCH'
    )
    {
      return getRequestType( handlerInput.requestEnvelope ) === 'IntentRequest'
        && getIntentName( handlerInput.requestEnvelope ) === 'FlipIntent'
    }
    else if ( sessionAttributes.gameState == 'DONE' )
    {
      return getRequestType( handlerInput.requestEnvelope ) === 'IntentRequest'
        && (
          getIntentName( handlerInput.requestEnvelope ) === 'FlipIntent'
          || getIntentName( handlerInput.requestEnvelope ) === 'AMAZON.YesIntent'
        )
    }

    return false
  },
  async handle( handlerInput: HandlerInput ) : Promise<Response>
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'FlipIntentHandler', { sessionAttributes, requestAttributes } )

    // "alexa, tell heads or tails to flip"
    if ( isNewSession( handlerInput.requestEnvelope ) ) {
      sessionAttributes.currentScore = 0
      sessionAttributes.highScore = 0
    }
    sessionAttributes.gameState = 'PLAYING'

    // FLIP THE COIN: heads = 0, tails = 1
    sessionAttributes.coinState = Math.floor( Math.random() * 2 )

    // save the updated session attributes
    handlerInput.attributesManager.setSessionAttributes( sessionAttributes )

    // save the start of the session to ddb
    await persistSessionState( handlerInput, 'PLAYING' )

    const speakText = requestAttributes.t( 'FLIP_SPEAK' )
    const repromptText = requestAttributes.t( 'FLIP_REPROMPT' )
    const cardTitle = requestAttributes.t( 'CARD_TITLE' )
    const cardText = requestAttributes.t( 'FLIP_CARD_TEXT' )

    return handlerInput.responseBuilder
      .speak( speakText )
      .reprompt( repromptText )
      .withSimpleCard( cardTitle, cardText )
      .getResponse()
  },
}

const HintIntentHandler: RequestHandler = {
  canHandle( handlerInput: HandlerInput )
  {
    // invalid if the game is not already started
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    if ( sessionAttributes?.gameState != 'PLAYING' ) {
      return false
    }

    return getRequestType( handlerInput.requestEnvelope ) === 'IntentRequest'
      && getIntentName( handlerInput.requestEnvelope ) === 'HintIntent'
  },
  handle( handlerInput: HandlerInput ) : Response
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'HintIntentHandler', { sessionAttributes, requestAttributes } )

    const speakText = requestAttributes.t( 'HINT_SPEAK' )
    const repromptText = requestAttributes.t( 'HINT_REPROMPT' )
    const cardTitle = requestAttributes.t( 'CARD_TITLE' )
    const cardText = requestAttributes.t( 'HINT_CARD_TEXT' )

    return handlerInput.responseBuilder
      .speak( speakText )
      .reprompt( repromptText )
      .withSimpleCard( cardTitle, cardText )
      .getResponse()
  },
}

const AnswerIncorrectIntentHandler: RequestHandler = {
  canHandle( handlerInput: HandlerInput )
  {
    // invalid if the game is not already started
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    if ( sessionAttributes.gameState != 'PLAYING' ) {
      return false
    }

    if ( getRequestType( handlerInput.requestEnvelope ) !== 'IntentRequest' ) {
      return false
    }

    // what the user guessed
    const intentName = getIntentName( handlerInput.requestEnvelope )

    // test mode: heads wins, tails loses
    if ( config.isTestMode ) {
      logger.info( 'test mode', { sessionAttributes, intentName } )
      return ( intentName === 'TailsIntent' )
    }

    // guess in was INCORRECT: heads != 0, tails != 1
    return ( intentName === 'HeadsIntent' ) ? ( sessionAttributes.coinState != 0 )
         : ( intentName === 'TailsIntent' ) ? ( sessionAttributes.coinState != 1 )
         : false
  },
  handle( handlerInput: HandlerInput ) : Response
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'AnswerIncorrectIntentHandler', { sessionAttributes, requestAttributes } )

    const coinName = ( !! sessionAttributes.coinState ) ? 'TAILS' : 'HEADS'
    const finalScore = sessionAttributes.currentScore

    let speakText
    let repromptText = requestAttributes.t( 'ANSWER_INCORRECT_REPROMPT' )
    let cardTitle = requestAttributes.t( 'CARD_TITLE' )
    let cardText

    if ( finalScore > 0 )
    {
      if (
        ( finalScore >= config.minimumHighScore )
        && ( finalScore >= sessionAttributes.highScore  )
      )
      {
        logger.info( 'new high score', { sessionAttributes, requestAttributes } )
        speakText = requestAttributes.t( 'ANSWER_INCORRECT_HIGH_SCORE_SPEAK', coinName, finalScore )
        cardText = requestAttributes.t( 'ANSWER_INCORRECT_HIGH_SCORE_CARD_TEXT', coinName, finalScore )
      }
      else
      {
        speakText = requestAttributes.t( 'ANSWER_INCORRECT_SCORE_SPEAK', coinName, finalScore )
        cardText = requestAttributes.t( 'ANSWER_INCORRECT_SCORE_CARD_TEXT', coinName, finalScore )
      }
    }
    else
    {
      speakText = requestAttributes.t( 'ANSWER_INCORRECT_SPEAK', coinName, finalScore )
      cardText = requestAttributes.t( 'ANSWER_INCORRECT_CARD_TEXT', coinName, finalScore )
    }

    sessionAttributes.gameState = 'DONE'
    sessionAttributes.currentScore = 0

    // save the updated session attributes
    handlerInput.attributesManager.setSessionAttributes( sessionAttributes )

    return handlerInput.responseBuilder
      .speak( speakText )
      .reprompt( repromptText )
      .withSimpleCard( cardTitle, cardText )
      .getResponse()
  }
}

const AnswerCorrectIntentHandler: RequestHandler = {
  canHandle( handlerInput: HandlerInput )
  {
    // invalid if the game is not already started
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    if ( sessionAttributes.gameState != 'PLAYING' ) {
      return false
    }

    if ( getRequestType( handlerInput.requestEnvelope ) !== 'IntentRequest' ) {
      return false
    }

    // what the user guessed
    const intentName = getIntentName( handlerInput.requestEnvelope )

    // test mode: heads wins, tails loses
    if ( config.isTestMode ) {
      logger.debug( 'test mode', { sessionAttributes, intentName } )
      return ( intentName === 'HeadsIntent' )
    }

    // guess was CORRECT: heads == 0, tails == 1
    return ( intentName === 'HeadsIntent' ) ? ( sessionAttributes.coinState == 0 )
         : ( intentName === 'TailsIntent' ) ? ( sessionAttributes.coinState == 1 )
         : false
  },
  handle( handlerInput: HandlerInput ) : Response
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'AnswerCorrectIntentHandler', { sessionAttributes, requestAttributes } )

    let speakText
    let repromptText = requestAttributes.t( 'ANSWER_CORRECT_REPROMPT' )
    let cardTitle = requestAttributes.t( 'CARD_TITLE' )
    let cardText

    // update current score
    const newScore = sessionAttributes.currentScore + 1
    sessionAttributes.currentScore = newScore

    // update high score
    if ( newScore > sessionAttributes.highScore ) {
      sessionAttributes.highScore = newScore
      logger.info( 'new high score', { sessionAttributes } )
    }

    // alternate speak text
    if ( ( newScore > 0 ) && ( newScore % 2 == 0 ) )
    {
      speakText = requestAttributes.t( 'ANSWER_CORRECT_EVEN_SPEAK', newScore )
      cardText = requestAttributes.t( 'ANSWER_CORRECT_EVEN_CARD_TEXT', newScore )
    }
    else
    {
      speakText = requestAttributes.t( 'ANSWER_CORRECT_ODD_SPEAK' )
      cardText = requestAttributes.t( 'ANSWER_CORRECT_ODD_CARD_TEXT', newScore )
    }

    // FLIP THE COIN: heads = 0, tails = 1
    sessionAttributes.coinState = Math.floor( Math.random() * 2 )

    // save the updated session attributes
    handlerInput.attributesManager.setSessionAttributes( sessionAttributes )

    return handlerInput.responseBuilder
      .speak( speakText )
      .reprompt( repromptText )
      .withSimpleCard( cardTitle, cardText )
      .getResponse()
  }
}

const ReplayNoIntent: RequestHandler = {
  canHandle( handlerInput: HandlerInput )
  {
    // invalid if the game is not done
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    if ( sessionAttributes?.gameState != 'DONE' ) {
      return false
    }

    return getRequestType( handlerInput.requestEnvelope ) === 'IntentRequest'
      && getIntentName( handlerInput.requestEnvelope ) === 'AMAZON.NoIntent'
  },
  async handle( handlerInput: HandlerInput ) : Promise<Response>
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'ReplayNoIntent', { sessionAttributes, requestAttributes } )

    const speakText = ( sessionAttributes.highScore >= config.minimumHighScore )
      ? requestAttributes.t( 'REPLAY_NO_HIGH_SCORE_SPEAK', sessionAttributes.highScore )
      : requestAttributes.t( 'REPLAY_NO_SPEAK' )
      ;

    // save the start of the session to ddb
    await persistSessionState( handlerInput, 'DONE' )

    return handlerInput.responseBuilder
      .speak( speakText )
      .getResponse()
  }
}

const UnhandledPlayingIntent: RequestHandler = {
  canHandle( handlerInput: HandlerInput )
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    return getRequestType( handlerInput.requestEnvelope ) === 'IntentRequest'
      && ( sessionAttributes.gameState == 'PLAYING' )
  },
  handle( handlerInput: HandlerInput ) : Response
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'UnhandledPlayingIntent', { sessionAttributes, requestAttributes } )

    const speakText = requestAttributes.t( 'UNHANDLED_PLAYING_SPEAK' )
    const repromptText = requestAttributes.t( 'UNHANDLED_PLAYING_REPROMPT' )
    const cardTitle = requestAttributes.t( 'CARD_TITLE' )
    const cardText = requestAttributes.t( 'UNHANDLED_PLAYING_CARD_TEXT' )

    return handlerInput.responseBuilder
      .speak( speakText )
      .reprompt( repromptText )
      .withSimpleCard( cardTitle, cardText )
      .getResponse()
  },
}

const UnhandledIntent: RequestHandler = {
  canHandle( handlerInput: HandlerInput )
  {
    return true
  },
  handle( handlerInput: HandlerInput ) : Response
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'UnhandledIntent', { sessionAttributes, requestAttributes } )

    const speakText = requestAttributes.t( 'UNHANDLED_OTHER_SPEAK' )
    const repromptText = requestAttributes.t( 'UNHANDLED_OTHER_REPROMPT' )
    const cardTitle = requestAttributes.t( 'CARD_TITLE' )
    const cardText = requestAttributes.t( 'UNHANDLED_OTHER_CARD_TEXT' )

    return handlerInput.responseBuilder
      .speak( speakText )
      .reprompt( repromptText )
      .withSimpleCard( cardTitle, cardText )
      .getResponse()
  },
}


//
//
//

const HelpIntentHandler: RequestHandler = {
  canHandle( handlerInput: HandlerInput )
  {
    return getRequestType( handlerInput.requestEnvelope ) === 'IntentRequest'
      && getIntentName( handlerInput.requestEnvelope ) === 'AMAZON.HelpIntent'
  },
  handle( handlerInput: HandlerInput ) : Response
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'HelpIntentHandler', { sessionAttributes, requestAttributes } )

    const speakText = requestAttributes.t( 'HELP_SPEAK' )
    const repromptText = requestAttributes.t( 'HELP_REPROMPT' )
    const cardTitle = requestAttributes.t( 'CARD_TITLE' )
    const cardText = requestAttributes.t( 'HELP_CARD_TEXT' )

    return handlerInput.responseBuilder
      .speak( speakText )
      .reprompt( repromptText )
      .withSimpleCard( cardTitle, cardText )
      .getResponse()
  },
}

const ExitHandler: RequestHandler = {
  canHandle( handlerInput: HandlerInput )
  {
    return getRequestType( handlerInput.requestEnvelope ) === 'IntentRequest'
      && (
        getIntentName( handlerInput.requestEnvelope ) === 'AMAZON.CancelIntent'
        || getIntentName( handlerInput.requestEnvelope ) === 'AMAZON.StopIntent'
      )
  },
  handle( handlerInput: HandlerInput )
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'ExitHandler', { sessionAttributes, requestAttributes } )

    const speakText = requestAttributes.t( 'EXIT_SPEAK' )

    return handlerInput.responseBuilder
      .speak( speakText )
      .getResponse()
  },
}

const SessionEndedRequestHandler: RequestHandler = {
  canHandle( handlerInput: HandlerInput )
  {
    return getRequestType( handlerInput.requestEnvelope ) === 'SessionEndedRequest'
  },
  async handle( handlerInput: HandlerInput ): Promise<Response>
  {
    const attributesManager = handlerInput.attributesManager

    const sessionAttributes = attributesManager.getSessionAttributes()
    const requestAttributes = attributesManager.getRequestAttributes()
    logger.info( 'SessionEndedRequestHandler', { sessionAttributes, requestAttributes } )

    // save the start of the session to ddb
    await persistSessionState( handlerInput, 'ENDED' )

    // clear the session attributes
    attributesManager.setSessionAttributes({})

    return handlerInput.responseBuilder
      .getResponse()
  },
}

const ErrorHandler : ErrorHandler = {
  canHandle( handlerInput : HandlerInput, error : Error ) : boolean
  {
    return true
  },
  handle( handlerInput : HandlerInput, error : Error ) : Response
  {
    logger.error( 'handling error', { error } )

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'ErrorHandler', { sessionAttributes, requestAttributes } )

    const speakText = requestAttributes.t( 'ERROR_SPEAK' )
    const repromptText = requestAttributes.t( 'ERROR_REPROMPT' )
    const cardTitle = requestAttributes.t( 'CARD_TITLE' )
    const cardText = requestAttributes.t( 'ERROR_CARD_TEXT' )

    return handlerInput.responseBuilder
      .speak( speakText )
      .reprompt( repromptText )
      .withSimpleCard( cardTitle, cardText )
      .getResponse()
  }
}

//
//
//

const LocalizationInterceptor = {
  process( handlerInput: HandlerInput ) {
    const localizationClient = i18n.use( sprintf ).init({
      lng: handlerInput.requestEnvelope.request.locale,
      fallbackLng: 'en', // fallback to EN if locale doesn't exist
      resources: languageStrings
    })

    localizationClient.localize = function () {
      const args = arguments
      let values = []

      for (var i = 1; i < args.length; i++) {
        values.push( args[i] )
      }

      const value = i18n.t( args[0], {
        returnObjects: true,
        postProcess: 'sprintf',
        sprintf: values
      })

      return ( Array.isArray(value) )
        ? value[ Math.floor( Math.random() * value.length ) ]
        : value
    }

    const attributes = handlerInput.attributesManager.getRequestAttributes()
    attributes.t = function ( ...args: any ) { // pass on arguments to the localizationClient
      return localizationClient.localize( ...args )
    }
  },
}

//
// persistance
//

async function persistSessionState( handlerInput: HandlerInput, sessionState: string ) : Promise<void>
{
    const requestEnvelope = handlerInput.requestEnvelope
    const attributesManager = handlerInput.attributesManager

    const sessionAttributes = attributesManager.getSessionAttributes()

    const data = {
      deviceId: requestEnvelope?.context?.System?.device?.deviceId,
      sessionId: requestEnvelope?.session?.sessionId,
      userId: requestEnvelope?.session?.user?.userId,
      ...sessionAttributes,
      sessionState,
    }

    attributesManager.setPersistentAttributes({
      ...data,
      data: JSON.stringify( data ),
    })

    await attributesManager.savePersistentAttributes()
}

//
//
//

export const handler = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    FlipIntentHandler,
    AnswerIncorrectIntentHandler,
    AnswerCorrectIntentHandler,
    ReplayNoIntent,
    HintIntentHandler,
    HelpIntentHandler,
    ExitHandler,
    SessionEndedRequestHandler,
    UnhandledPlayingIntent,
    UnhandledIntent,
  )
  .addRequestInterceptors( LocalizationInterceptor )
  .addErrorHandlers( ErrorHandler )
  .withPersistenceAdapter( new MyPersistenceAdapter() as PersistenceAdapter )
  .lambda()
