
# Heads or Tails: Alexa Skill Lambda

![Heads or Tails](https://res.cloudinary.com/rulez-new-media/image/upload/w_256,c_fill/alexa/DALL_E_2023-02-18_19.19.15_k5uhgb.png)

https://www.amazon.com/dp/B073YHQ5JX

## Usage

```
User: Alexa, open Heads or Tails.
Alexa: Welcome to Heads or Tails. Say FLIP to start, or HELP for how to play.

User: Flip.
Alexa: Okay, the coin is in the air. What's your call? Heads? Or Tails?

User: Heads
Alexa: Correct! Here we go: What's your call? Heads or Tails?

[...]

User: Tails
Alexa: Sorry, the coin came up heads. You got 3 in a row, and that's a high score this round.
```

## Development

Configure Nodejs:

```
nvm use
```

Setup environment:

```
vim .env

LOG_LEVEL="debug"
TEST_MODE="1"
```

Install Dependencies:

```
yarn
```

Build for debugging:

```
yarn run debug
```

Open [VS Code](https://code.visualstudio.com/):

```
code .
```

Download and edit skill:

- Alexa Skills Toolkit -> Skills Management -> Download and edit skill -> Heads or Tails

Run debugger:

- Press `F5`

Open the simulator or run the `ask dialog` command:

```
ask dialog \
    --profile rulez \
    --locale en-US
```

## Documentation

- [Alexa Skills Kit (ASK) Toolkit](https://marketplace.visualstudio.com/items?itemName=ask-toolkit.alexa-skills-kit-toolkit)

### Alexa Developer Docs

- https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs
- https://github.com/alexa/ask-toolkit-for-vscode
- https://developer.amazon.com/en-US/docs/alexa/smapi/ask-cli-command-reference.html
- https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/overview.html

### Other References

- [Coin flipping](https://en.wikipedia.org/wiki/Coin_flipping6)
