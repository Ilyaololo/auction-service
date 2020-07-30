import AWS from 'aws-sdk';
import createError from 'http-errors';
import validator from '@middy/validator';

import placeBidSchema from '../../lib/schemas/placeBidSchema';
import commonMiddleware from '../../lib/commonMiddleware';
import { getAuctionById } from './getAuction';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
  const {
    body: { amount },
    pathParameters: { id },
    requestContext: {
      authorizer: { email },
    },
  } = event;

  const auction = await getAuctionById(id);

  // Bid identity validation
  if (auction.seller === email) {
    throw new createError.Forbidden(`You cannot bid on your own auctions!`)
  }

  // Avoid double validation
  if (auction.highestBid.bidder === email) {
    throw new createError.Forbidden(`You are already the highest bidder!`)
  }

  // Auction status validation
  if (auction.status !== 'OPEN') {
    throw new createError.Forbidden(`You bid on closed auctions!`)
  }

  // Bid amount validation
  if (amount <= auction.highestBid.amount) {
    throw new createError.Forbidden(`Your bid must be higher than ${auction.highestBid.amount}!`)
  }

  let updatedAuction;

  try {
    const result = await dynamodb.update({
      TableName: process.env.AUCTIONS_TABLE_NAME,
      Key: { id },
      UpdateExpression: 'set highestBid.amount = :amount, highestBid.bidder = :bidder',
      ExpressionAttributeValues: {
        ':amount': amount,
        ':bidder': email,
      },
      ReturnValues: 'ALL_NEW',
    }).promise();

    updatedAuction = result.Attributes;
  } catch (err) {
    console.error(err);
    throw new createError.InternalServerError(err);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  };
}

export const handler = commonMiddleware(placeBid)
  .use(validator({ inputSchema: placeBidSchema }));
