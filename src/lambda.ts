
import { config } from './config'
import { logger } from './logger'

import {
  getRequestType,
  getIntentName,
} from 'ask-sdk'

import {
  ErrorHandler,
  HandlerInput,
  RequestHandler,
  SkillBuilders,
} from 'ask-sdk-core'

import {
  Response,
  SessionEndedRequest,
} from 'ask-sdk-model'

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
  handle( handlerInput: HandlerInput ) : Response
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'LaunchRequestHandler', { sessionAttributes, requestAttributes } )

    // set the game state
    sessionAttributes.gameState = 'LAUNCH'
    sessionAttributes.highScore = 0

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

    if ( ! sessionAttributes.gameState || sessionAttributes.gameState == 'LAUNCH' )
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
  handle( handlerInput: HandlerInput ) : Response
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'FlipIntentHandler', { sessionAttributes, requestAttributes } )

    // set the game state
    sessionAttributes.gameState = 'PLAYING'

    // FLIP THE COIN: heads = 0, tails = 1
    sessionAttributes.coinState = Math.floor( Math.random() * 2 )

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
    const currentScore = sessionAttributes.currentScore

    let speakText
    let repromptText = requestAttributes.t( 'ANSWER_INCORRECT_REPROMPT' )
    let cardTitle = requestAttributes.t( 'CARD_TITLE' )
    let cardText

    if ( sessionAttributes.currentScore > 0 )
    {
      if (
        ( currentScore >= config.minimumHighScore )
        && ( currentScore >= sessionAttributes.highScore  )
      )
      {
        speakText = requestAttributes.t( 'ANSWER_INCORRECT_HIGH_SCORE_SPEAK', coinName, currentScore )
        cardText = requestAttributes.t( 'ANSWER_INCORRECT_HIGH_SCORE_CARD_TEXT', coinName, currentScore )
      }
      else
      {
        speakText = requestAttributes.t( 'ANSWER_INCORRECT_SCORE_SPEAK', coinName, currentScore )
        cardText = requestAttributes.t( 'ANSWER_INCORRECT_SCORE_CARD_TEXT', coinName, currentScore )
      }
    }
    else
    {
      speakText = requestAttributes.t( 'ANSWER_INCORRECT_SPEAK', coinName, currentScore )
      cardText = requestAttributes.t( 'ANSWER_INCORRECT_CARD_TEXT', coinName, currentScore )
    }

    sessionAttributes.gameState = 'DONE'
    sessionAttributes.currentScore = 0

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
    const currentScore = sessionAttributes.currentScore + 1
    sessionAttributes.currentScore = currentScore

    // update high score
    if ( currentScore > sessionAttributes.highScore ) {
      sessionAttributes.highScore = currentScore
    }

    // alternate speak text
    if ( ( currentScore > 0 ) && ( currentScore % 2 == 0 ) )
    {
      speakText = requestAttributes.t( 'ANSWER_CORRECT_EVEN_SPEAK', currentScore )
      cardText = requestAttributes.t( 'ANSWER_CORRECT_EVEN_CARD_TEXT', currentScore )
    }
    else
    {
      speakText = requestAttributes.t( 'ANSWER_CORRECT_ODD_SPEAK' )
      cardText = requestAttributes.t( 'ANSWER_CORRECT_ODD_CARD_TEXT', currentScore )
    }

    // FLIP THE COIN: heads = 0, tails = 1
    sessionAttributes.coinState = Math.floor( Math.random() * 2 )

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
  handle( handlerInput: HandlerInput ) : Response
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'ReplayNoIntent', { sessionAttributes, requestAttributes } )

    const speakText = ( sessionAttributes.highScore >= config.minimumHighScore )
      ? requestAttributes.t( 'REPLAY_NO_HIGH_SCORE_SPEAK', sessionAttributes.highScore )
      : requestAttributes.t( 'REPLAY_NO_SPEAK' )

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

    // set the game state
    sessionAttributes.gameState = 'EXIT'

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
  handle( handlerInput: HandlerInput )
  {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    logger.info( 'SessionEndedRequestHandler', { sessionAttributes, requestAttributes } )

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
  .lambda()
