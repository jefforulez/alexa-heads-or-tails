
import { config } from './config'
import { logger } from './logger'

import {
  DynamoDB
} from 'aws-sdk'

import {
  PersistenceAdapter,
  createAskSdkError,
} from 'ask-sdk-core'

import {
  RequestEnvelope,
} from 'ask-sdk-model'

import {
  DynamoDbPersistenceAdapter,
} from 'ask-sdk-dynamodb-persistence-adapter'

import { DateTime } from 'luxon'

const PartitionKeyGeneratorSessionId = function ( requestEnvelope: RequestEnvelope ) : string
{
  if ( ! requestEnvelope?.session?.sessionId )
  {
    throw createAskSdkError(
      'PartitionKeyGenerators',
      'Cannot retrieve user id from request envelope!',
    )
  }

  return requestEnvelope!.session!.sessionId
}

export class MyPersistenceAdapter extends DynamoDbPersistenceAdapter implements PersistenceAdapter
{
  constructor()
  {
    super({
      tableName: config.ddbTableName,
      partitionKeyName: 'id',
      attributesName: 'attributes',
      createTable: false,
      partitionKeyGenerator: PartitionKeyGeneratorSessionId,
      dynamoDBClient: new DynamoDB({
        apiVersion: 'latest',
        region: 'us-east-1',
      })
    })
  }

  async saveAttributes( requestEnvelope: RequestEnvelope, attributes: {[key: string]: any} ) : Promise<void>
  {
    const attributesId = this.partitionKeyGenerator( requestEnvelope )

    const timeToLive = DateTime.now()
      .plus({ days : config.ddbTimeToLiveDays })
      .toUnixInteger()

    const putParams = {
      TableName: this.tableName,
      Item: {
        [this.partitionKeyName]: attributesId,
        [this.attributesName]: attributes,
        timeToLive,
      },
    }

    try {
      await this.dynamoDBDocumentClient.put( putParams ).promise()
    }
    catch (err: any) {
      throw createAskSdkError(
        this.constructor.name,
        `Could not save item (${attributesId}) to table (${putParams.TableName}): ${err.message}`
      )
    }
  }

}

