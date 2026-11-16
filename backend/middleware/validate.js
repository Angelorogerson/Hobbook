import mongoose from 'mongoose';

/**
 * Validate req[source] against a zod schema and replace it with the parsed value.
 * Responds 400 with { message, errors: { field: message } } on failure.
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!errors[key]) errors[key] = issue.message;
    }
    const first = Object.values(errors)[0];
    return res.status(400).json({ message: first || 'Ungültige Eingabe', errors });
  }
  // Express 4 allows reassigning req.query; keep parsed values separately to be explicit.
  req.validated = { ...(req.validated || {}), [source]: result.data };
  return next();
};

/** 404 for malformed ObjectIds instead of a CastError 500. */
export const validateObjectId = (param = 'id') => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) {
    return res.status(404).json({ message: 'Nicht gefunden' });
  }
  return next();
};
