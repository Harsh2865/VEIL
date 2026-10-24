import {
  createUrlRecord,
  getUrlsByClientId,
  deleteUrlRecord,
  checkCodeAvailability,
} from '../services/shortUrlService.js';

export async function createUrl(req, res, next) {
  try {
    const { url, customCode, label } = req.body || {};
    const record = await createUrlRecord({
      url,
      customCode,
      label,
      clientId: req.clientId,
    });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function listUrls(req, res, next) {
  try {
    const { limit, cursor } = req.query;
    const history = await getUrlsByClientId({
      clientId: req.clientId,
      limit,
      cursor,
    });
    res.status(200).json(history);
  } catch (err) {
    next(err);
  }
}

export async function deleteUrl(req, res, next) {
  try {
    const { id } = req.params;
    await deleteUrlRecord({
      id,
      clientId: req.clientId,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function checkAvailability(req, res, next) {
  try {
    const { code } = req.params;
    const result = await checkCodeAvailability(code);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
