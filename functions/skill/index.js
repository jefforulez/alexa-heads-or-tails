
var Alexa = require( 'alexa-sdk' )

var languageStrings = {
    'en-US': {
        'translation': {
            'CARD_TITLE' : 'Heads or Tails'
                ,
            'WELCOME_PROMPT'
                : " Welcome to Heads or Tails."
                + " Say FLIP to start, or HELP for how to play."
                ,
            'WELCOME_CARD_TEXT'
                : " Let's play! Say Flip, to start."
                ,
            'PHRASE_THE_COIN_IS_IN_THE_AIR'
                : " Okay, the coin is in the air."
                ,
            'PHRASE_WHATS_YOUR_CALL'
                : " What's your call? Heads? or Tails."
                ,
            'PHRASE_SAY_FLIP_TO_BEGIN'
                : " Say Flip to begin."
                ,
            'PHRASE_WANT_TO_PLAY_AGAIN'
                : " Want to play again?"
                ,
            'PHRASE_SORRY_I_DIDNT_GET_THAT'
                : " Sorry, I didn't get that."
                ,
            'PHRASE_OKAY_GOODBYE'
                : " Okay."
                ,
            'HINT_PROMPT'
                : " Okay, here's your hint. The coin is heads, or maybe it's tails."
                ,
            'ERROR_PROMPT'
                : " Yikes. I'm Sorry. I think i lost my coin."
                ,
            'HELP_PROMPT'
                : " The game is easy. I flip a coin and you guess if it came up heads or tails."
                + " If you guess right, you get a point and we keep going."
                + " If you guess wrong, the game is over."
        }
    }
};

exports.handle = function ( event, context, callback ) {

    var alexa = Alexa.handler( event, context )

    alexa.resources = languageStrings ;

    // alexa.appId = 'amzn1.echo-sdk-ams.app.1234';
    ///alexa.dynamoDBTableName = 'YourTableName'; // creates new table for session.attributes

    alexa.registerHandlers(
        newSessionHandlers,
        startSessionHandlers,
        gameHandlers
    )

    alexa.execute()
};

var states = {
    START    : '_START',
    PLAYING  : '_PLAYING'
};

var newSessionHandlers = {

    'NewSession' : function () {
        console.log( 'newSessionHandlers.NewSession, this.event:', this.request )
        this.handler.state = states.START
        this.emitWithState( 'NewSession' )
    },

};

var startSessionHandlers = Alexa.CreateStateHandler( states.START, {

    'NewSession': function () {
        console.log( 'startSessionHandlers.NewSession, this.event:', this.event )

        if ( this.event.request.type === 'IntentRequest' )
        {
            if ( this.event.request.intent.name === 'FlipIntent' ) {
                this.handler.state = states.PLAYING
                this.emitWithState( 'FlipIntent' )
            }
            else if ( this.event.request.intent.name === 'AMAZON.HelpIntent' ) {
                this.handler.state = states.PLAYING
                this.emitWithState( 'AMAZON.HelpIntent' )
            }
        }
        else if ( this.event.request.type === 'LaunchRequest' )
        {
            this.emit( ':askWithCard',
                this.t( 'WELCOME_PROMPT' ),
                this.t( 'PHRASE_SAY_FLIP_TO_BEGIN' ),
                this.t( 'CARD_TITLE' ),
                this.t( 'WELCOME_CARD_TEXT' )
            )
        }
    },

    'FlipIntent' : function () {
        this.handler.state = states.PLAYING
        this.emitWithState( 'FlipIntent' )
    },

    'AMAZON.HelpIntent': function () {
        this.handler.state = states.PLAYING
        this.emitWithState( 'AMAZON.HelpIntent' )
    },

    'AMAZON.CancelIntent': function () {
        this.emit( ':tell', 'Goodbye' )
    },
    'AMAZON.StopIntent': function () {
        this.emit( ':tell', 'Goodbye' )
    },

    'Unhandled': function () {
        console.log( 'startSessionHandlers.Unhandled, this.event:', this.event )
        this.emit(
            ':ask',
            this.t( 'PHRASE_SORRY_I_DIDNT_GET_THAT' ),
            this.t( 'PHRASE_SAY_FLIP_TO_BEGIN' ),
            this.t( 'CARD_TITLE' ),
            "You can say 'Flip' to being or 'Help' for instructions on how to play."
        )
    }

});

var gameHandlers = Alexa.CreateStateHandler( states.PLAYING, {

    'FlipIntent' : function () {
        console.log( 'gameHandlers.FlipIntent, this.event:', this.event )

        if ( ! ( 'IS_GAME_RUNNING' in this.attributes ) )
        {
            this.attributes[ 'CURRENT_SCORE' ] = 0
            this.attributes[ 'HIGH_SCORE_MINIMUM' ] = 1
            this.attributes[ 'HIGH_SCORE' ] = 1 // require two correct to make a high score

        }

        if ( this.attributes[ 'IS_GAME_RUNNING' ] == true ) {
            console.log( 'gameHandlers.FlipIntent, IS_GAME_RUNNING:',
                this.attributes[ 'IS_GAME_RUNNING' ] )
            this.emitWithState( 'Unhandled' )
            return
        }
        this.attributes[ 'IS_GAME_RUNNING' ] = true
        this.attributes[ 'CURRENT_SCORE' ] = 0

        this.emit(
            ':askWithCard',
            this.t( 'PHRASE_THE_COIN_IS_IN_THE_AIR' ) + this.t( 'PHRASE_WHATS_YOUR_CALL' ),
            this.t( 'PHRASE_WHATS_YOUR_CALL' ),
            this.t( 'CARD_TITLE' ),
            this.t( 'PHRASE_THE_COIN_IS_IN_THE_AIR' ) + this.t( 'PHRASE_WHATS_YOUR_CALL' )
        )
    },

    'HeadsIntent' : function () {
        console.log( 'gameHandlers.HeadsIntent(), this.event:', this.event )
        this.emitWithState( 'handleHeadsOrTails', { intent : 'HeadsIntent' } )
    },

    'TailsIntent' : function () {
        console.log( 'gameHandlers.TailsIntent(), this.event:', this.event )
        this.emitWithState( 'handleHeadsOrTails', { intent : 'TailsIntent' } )
    },

    'handleHeadsOrTails' : function ( data ) {
        console.log( 'handleHeadsOrTails(), data:', data )

        if ( this.attributes[ 'IS_GAME_RUNNING' ] == false ) {
            this.emitWithState( 'AMAZON.HelpIntent' )
            return
        }

        try
        {
            var call = ( data.intent === 'HeadsIntent' ) ? 0
                     : ( data.intent === 'TailsIntent' ) ? 1
                     : 42
                     ;

            // error condition
            if ( call === 42 ) {
                console.log( 'handleHeadsOrTails(), call:', call )

                this.emit( ':tellWithCard',
                    this.t( 'ERROR_PROMPT' ),
                    this.t( 'ERROR_PROMPT' ),
                    this.t( 'CARD_TITLE' ),
                    this.t( 'ERROR_PROMPT' ) + ' (' + data.intent + ' )'
                )
                return
            }

            var coin = Math.floor( Math.random() * 2 )
            console.log( 'handleHeadsOrTails(), call:', call, '; coin:', coin )

            var speech_output = ""

            if ( call != coin )
            {
                speech_output = "Sorry, the coin came up "
                    + ( ( coin == 0 ) ? "heads." : "tails." )
                    ;

                if ( this.attributes[ 'CURRENT_SCORE' ] > 0 )
                {
                    speech_output = speech_output
                        + " You got " + this.attributes[ 'CURRENT_SCORE' ] + " in a row"
                        ;

                    if (
                        ( this.attributes[ 'CURRENT_SCORE' ] > this.attributes[ 'HIGH_SCORE_MINIMUM' ] ) &&
                        ( this.attributes[ 'CURRENT_SCORE' ] >= this.attributes[ 'HIGH_SCORE' ] )
                    ) {
                        speech_output = speech_output
                            + ", and that's a high score this round"
                            ;
                    }

                    speech_output = speech_output + "."
                }

                speech_output = speech_output + this.t( 'PHRASE_WANT_TO_PLAY_AGAIN' )

                // prepare for another round; reset session attributes
                this.attributes[ 'CURRENT_SCORE' ] = 0
                this.attributes[ 'IS_GAME_RUNNING' ] = false

                this.emit( ':askWithCard',
                    speech_output,
                    this.t( 'PHRASE_WANT_TO_PLAY_AGAIN' ),
                    this.t( 'CARD_TITLE' ),
                    speech_output
                )

                return
            }

            this.attributes[ 'CURRENT_SCORE' ] = this.attributes[ 'CURRENT_SCORE' ] + 1

            if ( this.attributes[ 'CURRENT_SCORE' ] > this.attributes[ 'HIGH_SCORE' ] ) {
                this.attributes[ 'HIGH_SCORE' ] = this.attributes[ 'CURRENT_SCORE' ]
            }

            console.log( 'this.attributes:', this.attributes )

            speech_output = "Correct!"

            if (
                ( this.attributes[ 'CURRENT_SCORE' ] > 0 ) &&
                ( this.attributes[ 'CURRENT_SCORE' ] % 2 == 0 )
            ) {
                speech_output = speech_output
                    + " That's " + this.attributes[ 'CURRENT_SCORE' ] + " in a row.\n"
                    ;
            }

            speech_output = speech_output
                + " Here we go: " + this.t( 'PHRASE_WHATS_YOUR_CALL' )
                ;

            this.emit( ':askWithCard',
                speech_output,
                this.t( 'PHRASE_WHATS_YOUR_CALL' ),
                this.t( 'CARD_TITLE' ),
                speech_output
            )
        }
        catch ( e )
        {
            console.log( e )
            this.emit( ':tellWithCard',
                this.t( 'ERROR_PROMPT' ),
                this.t( 'CARD_TITLE' ),
                e
            )
        }

        return
    },

    'HintIntent' : function () {
        console.log( 'gameHandlers.HintIntent, this.event:', this.event )
        this.emit( ':ask', this.t( 'HINT_PROMPT') + this.t( 'PHRASE_WHATS_YOUR_CALL' ) )
    },

    'ErrorIntent' : function () {
        console.log( 'gameHandlers.ErrorIntent, this.event:', this.event )
        this.emit( ':tell', this.t( 'ERROR_PROMPT') )
    },

    'AMAZON.YesIntent': function () {
        console.log( 'gameHandlers.AMAZON.YesIntent, this.event:', this.event )

        if ( this.attributes[ 'IS_GAME_RUNNING' ] == false ) {
            this.emitWithState( 'FlipIntent' ) ;
        }
        else {
            this.emitWithState( 'Unhandled' ) ;
        }
    },
    'AMAZON.NoIntent': function () {

        var speech_output = this.t( 'PHRASE_OKAY_GOODBYE' )

        if ( this.attributes[ 'HIGH_SCORE' ] > 1 ) {
            speech_output = speech_output
                + " Your high score was " + this.attributes[ 'HIGH_SCORE' ] + "."
                + " Goodbye!"
                ;
        }

        this.emit( ':tell', speech_output )
    },
    'AMAZON.StopIntent': function () {
        this.emit( ':tell', this.t( 'PHRASE_OKAY_GOODBYE' ) )
    },

    'AMAZON.HelpIntent': function () {
        console.log( 'gameHandlers.AMAZON.HelpIntent, this.event:', this.event )
        this.emit( ':ask',
            this.t( 'HELP_PROMPT' ) + this.t( 'PHRASE_SAY_FLIP_TO_BEGIN' ),
            this.t( 'PHRASE_SAY_FLIP_TO_BEGIN' ),
            this.t( 'CARD_TITLE' ),
            this.t( 'HELP_PROMPT' )
        )
    },

    'Unhandled': function () {
        console.log( 'gameHandlers.Unhandled, this.event:', this.event )
        this.emit( ':askWithCard',
            this.t( 'PHRASE_SORRY_I_DIDNT_GET_THAT' ) + this.t( 'PHRASE_WHATS_YOUR_CALL' ),
            this.t( 'PHRASE_WHATS_YOUR_CALL' ),
            this.t( 'CARD_TITLE' ),
            this.t( 'PHRASE_WHATS_YOUR_CALL' )
        )
    }

});


//
//
//

