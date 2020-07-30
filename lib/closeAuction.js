import AWS from 'aws-sdk';

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

export async function closeAuction({ id, title, seller, highestBid: { amount, bidder }}) {
  await dynamodb.update({
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id: id },
    UpdateExpression: 'set #status = :status',
    ExpressionAttributeValues: {
      ':status': 'CLOSED',
    },
    ExpressionAttributeNames: {
      '#status': 'status',
    },
  }).promise();

  if (amount === 0) {
    return sqs.sendMessage({
      QueueUrl: process.env.MAIL_QUEUE_URL,
      MessageBody: JSON.stringify({
        subject: 'No bids on your auction item :(',
        recipient: seller,
        body: `Oh no! Your item "${title}" didn't get any bids. Better luck next time!`,
      }),
    }).promise();
  }

  return Promise.all([
    sqs.sendMessage({
      QueueUrl: process.env.MAIL_QUEUE_URL,
      MessageBody: JSON.stringify({
        subject: 'Your item has been sold!',
        recipient: seller,
        body: `Woohoo! Your item "${title}" has been sold for $${amount}`,
      }),
    }).promise(),

    sqs.sendMessage({
      QueueUrl: process.env.MAIL_QUEUE_URL,
      MessageBody: JSON.stringify({
        subject: 'You won an auction!',
        recipient: bidder,
        body: `What a great deal! You got yourself a "${title}" for $${amount}.`,
      }),
    }).promise(),
  ])


}
