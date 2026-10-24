import mongoose from 'mongoose';
import { ShortUrl } from '../models/ShortUrl.js';
import { createShortCode } from '../utils/createShortCode.js';
import { validateUrl } from '../utils/validateUrl.js';
import { validateCode } from '../utils/validateCode.js';
import { isReservedCode } from '../utils/reservedCodes.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

export function formatShortUrl(doc) {
  return {
    id: doc._id.toString(),
    originalUrl: doc.originalUrl,
    shortCode: doc.shortCode,
    label: doc.label || null,
    shortUrl: `${env.PUBLIC_SHORT_URL_BASE}/s/${doc.shortCode}`,
    clickCount: doc.clickCount,
    createdAt: doc.createdAt.toISOString(),
    lastClickedAt: doc.lastClickedAt ? doc.lastClickedAt.toISOString() : null,
  };
}

export async function createUrlRecord({ url, customCode, label, clientId }) {
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    throw new AppError('VALIDATION_ERROR', urlValidation.message, 400);
  }

  let sanitizedLabel = null;
  if (label !== undefined && label !== null) {
    if (typeof label !== 'string') {
      throw new AppError('VALIDATION_ERROR', 'Label must be a string.', 400);
    }
    sanitizedLabel = label.trim().slice(0, 80) || null;
  }

  // Case 1: Custom short code requested
  if (customCode !== undefined && customCode !== null && customCode !== '') {
    const codeValidation = validateCode(customCode);
    if (!codeValidation.valid) {
      throw new AppError('VALIDATION_ERROR', codeValidation.message, 400);
    }

    try {
      const doc = await ShortUrl.create({
        originalUrl: urlValidation.url,
        shortCode: codeValidation.code,
        label: sanitizedLabel,
        clientId,
      });
      return formatShortUrl(doc);
    } catch (err) {
      if (err.code === 11000) {
        throw new AppError('CODE_TAKEN', 'The requested custom short code is already in use.', 409);
      }
      throw err;
    }
  }

  // Case 2: Generated short code with bounded collision retry (max 5 retries)
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const generatedCode = createShortCode(7);
    if (isReservedCode(generatedCode)) {
      continue;
    }

    try {
      const doc = await ShortUrl.create({
        originalUrl: urlValidation.url,
        shortCode: generatedCode,
        label: sanitizedLabel,
        clientId,
      });
      return formatShortUrl(doc);
    } catch (err) {
      if (err.code === 11000) {
        if (attempt === MAX_RETRIES) {
          console.error('[ShortUrlService] Exceeded maximum retries for unique short code generation');
          throw new AppError('SERVICE_UNAVAILABLE', 'Could not generate a unique short code. Please try again.', 503);
        }
        continue; // Retry next attempt
      }
      throw err;
    }
  }
}

export async function getUrlsByClientId({ clientId, limit = 20, cursor }) {
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  const query = { clientId };

  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      const cursorObj = JSON.parse(decoded);
      if (!cursorObj.createdAt || !cursorObj._id) {
        throw new Error('Malformed cursor payload');
      }

      const cursorDate = new Date(cursorObj.createdAt);
      const cursorId = new mongoose.Types.ObjectId(cursorObj._id);

      query.$or = [
        { createdAt: { $lt: cursorDate } },
        { createdAt: cursorDate, _id: { $lt: cursorId } },
      ];
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid pagination cursor.', 400);
    }
  }

  // Query limit + 1 items to determine if a next page exists
  const docs = await ShortUrl.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(parsedLimit + 1)
    .exec();

  const hasNextPage = docs.length > parsedLimit;
  const items = hasNextPage ? docs.slice(0, parsedLimit) : docs;

  let nextCursor = null;
  if (hasNextPage && items.length > 0) {
    const lastItem = items[items.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({
        createdAt: lastItem.createdAt.toISOString(),
        _id: lastItem._id.toString(),
      })
    ).toString('base64');
  }

  return {
    items: items.map(formatShortUrl),
    nextCursor,
  };
}

export async function deleteUrlRecord({ id, clientId }) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('NOT_FOUND', 'URL not found or unauthorized.', 404);
  }

  const result = await ShortUrl.deleteOne({
    _id: new mongoose.Types.ObjectId(id),
    clientId,
  }).exec();

  if (result.deletedCount === 0) {
    throw new AppError('NOT_FOUND', 'URL not found or unauthorized.', 404);
  }

  return true;
}

export async function checkCodeAvailability(code) {
  const validation = validateCode(code);
  if (!validation.valid) {
    return {
      available: false,
      reason: validation.reason,
    };
  }

  const existing = await ShortUrl.exists({ shortCode: validation.code }).exec();
  if (existing) {
    return {
      available: false,
      reason: 'taken',
    };
  }

  return {
    available: true,
  };
}

export async function incrementAndGetOriginalUrl(shortCode) {
  if (typeof shortCode !== 'string' || !/^[A-Za-z0-9_-]{3,30}$/.test(shortCode.trim())) {
    return null;
  }

  const updatedDoc = await ShortUrl.findOneAndUpdate(
    { shortCode: shortCode.trim() },
    {
      $inc: { clickCount: 1 },
      $set: { lastClickedAt: new Date() },
    },
    { new: true }
  ).exec();

  return updatedDoc ? updatedDoc.originalUrl : null;
}
