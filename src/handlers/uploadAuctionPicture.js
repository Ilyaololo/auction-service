import createError from 'http-errors';

import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpCors from "@middy/http-cors";
import validator from '@middy/validator';

import uploadAuctionPictureSchema from '../../lib/schemas/uploadAuctionPictureSchema';
import { setAuctionPictureUrl } from '../../lib/setAuctionPictureUrl'
import { uploadPictureToS3 } from '../../lib/uploadPictureToS3'
import { getAuctionById } from './getAuction';

async function uploadAuctionPicture(event, context) {
  const {
    body,
    pathParameters: { id },
    requestContext: {
      authorizer: { email },
    },
  } = event;

  const auction = await getAuctionById(id);

  // Validate auction ownership
  if (auction.seller !== email) {
    throw new createError.Forbidden(`You are not the seller of this auction!`)
  }

  const base64 = body.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  let updatedAuction;

  try {
    const pictureUrl = await uploadPictureToS3(`${auction.id}.jpg`, buffer);

    updatedAuction = await setAuctionPictureUrl(auction.id, pictureUrl);
  } catch (err) {
    console.error(err);
    throw new createError.InternalServerError(err);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  }
}

export const handler = middy(uploadAuctionPicture)
  .use(httpErrorHandler())
  .use(httpCors())
  .use(validator({ inputSchema: uploadAuctionPictureSchema }))
