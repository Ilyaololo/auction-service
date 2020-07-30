import createError from 'http-errors';

import { closeAuction } from '../../lib/closeAuction';
import { getEndedAuction } from '../../lib/getEndedAuction';

async function processAuctions(event, context) {
  try {
    const auctionToClose = await getEndedAuction();
    const promises = auctionToClose.map((auction) => closeAuction(auction));

    await Promise.all(promises);

    return { closed: promises.length };
  } catch (err) {
    console.error(err);
    throw new createError.InternalServerError(err);
  }
}

export const handler = processAuctions;
