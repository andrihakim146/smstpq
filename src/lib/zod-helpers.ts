import { z } from 'zod'

/** UUID opsional — string kosong dianggap null (hindari error "Invalid UUID"). */
export const optionalUuid = z.preprocess(
  (val) => (val === '' || val === undefined ? null : val),
  z.string().uuid().nullable(),
)

/** Tanggal YYYY-MM-DD opsional — string kosong dianggap null. */
export const optionalDate = z.preprocess(
  (val) => (val === '' || val === undefined ? null : val),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
)
