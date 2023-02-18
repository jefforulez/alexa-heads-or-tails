
// https://aws.amazon.com/blogs/compute/optimizing-node-js-dependencies-in-aws-lambda/

const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')

const srcDir = `src`
const outDir = `dist`

const entryPoints = fs
  .readdirSync(path.join(__dirname, srcDir))
  .map(entry => `${srcDir}/${entry}`)

esbuild
  .build({
    entryPoints: [ path.join( __dirname, srcDir, 'lambda.ts' ) ],
    outfile: path.join( __dirname, outDir, 'lambda.js' ),

    bundle: true,
    minify: false,
    sourcemap: 'linked',

    platform: 'node',
    target: 'es2022',

  })
  .catch( (err) => {
    console.log({ message: err.message })
    process.exit(1)
  })
