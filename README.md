
# Heads or Tails: Alexa Skill Lambda

![Heads or Tails](https://res.cloudinary.com/rulez-new-media/image/upload/w_256,c_fill/alexa/DALL_E_2023-02-18_19.19.15_k5uhgb.png)

https://www.amazon.com/dp/B073YHQ5JX

https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/overview.html

## Usage

```
User: Alexa, open Heads or Tails.
Alexa: Welcome to Heads or Tails. Say FLIP to start, or HELP for how to play.

User: Flip.
Alexa: Okay, the coin is in the air. What's your call? Heads or Tails?

User: Heads
Alexa: Correct! Here we go: What's your call? Heads or Tails?

[...]

User: Tails
Alexa: Sorry, the coin came up heads. You got 3 in a row, and that's a high score this round.
```

## Lambda Function

I use two tools for building and deploying lambda functions to aws:

* Apex Serverless Architecture - [http://apex.run](http://apex.run)
* AWS Profile GPG - [https://github.com/firstlookmedia/aws-profile-gpg](https://github.com/firstlookmedia/aws-profile-gpg)

Using these tools, my setup and deploy commands are:

#### Initialize Apex Environment

```
AWS_PROFILE=jefforulez aws-profile-gpg \
apex init
...
Project name: alexa_heads_or_tails
Project description: Alexa Heads-or-Tails Skill
...
```

Remove the extraneous `hello` function to speed deploys up:

```
/bin/rm -rf ./functions/hello
```

#### Building and Deploying the Function

```
AWS_PROFILE=jefforulez aws-profile-gpg \
apex deploy
```

#### Getting the FunctionArn

You'll need the lambda FunctionArn for configuring your alexa skill:

```
AWS_PROFILE=jefforulez aws-profile-gpg \
apex list | grep role | cut -d : -f 2- | tr -d ' '
```

## Alexa skill

#### Skill Publishing Information

**Testing Instructions**

```
No special instructions.  Just say "Alexa, open Heads or Tails" and play the game.
```

**Short Skill Description**

```
The Heads or Tails game tests your ability to call it in the air.
```

**Full Skill Description**

```
The Heads or Tails game tests your ability to call it in the air.

To get started say "Alexa, open Heads or Tails".

The app will keep ask you to guess "heads or tails?" until you get it wrong.

Each right answer gives you a point.  High score gets bragging rights!
```

**Example Phrases**

- Alexa, open Heads or Tails
- Alexa, tell Heads or Tails to flip
- Alexa, ask Heads or Tails for help

**Keywords**

```
Games of Chance, Coin Toss, Heads, Tails
```

**Images**

- [Small Icon](./images/skill-108.png)
- [Large Icon](./images/skill-512.png)


## References

- [Coin flipping](https://en.wikipedia.org/wiki/Coin_flipping6)


## Alexa Developer Docs

- https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs
- https://github.com/alexa/ask-toolkit-for-vscode
- https://developer.amazon.com/en-US/docs/alexa/smapi/ask-cli-command-reference.html

```
ask dialog --locale en-US --profile rulez
```

