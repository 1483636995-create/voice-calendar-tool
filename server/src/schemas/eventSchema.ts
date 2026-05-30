import { z } from 'zod'

export const eventStatusSchema = z.enum(['scheduled', 'completed', 'cancelled'])

const TITLE_MAX_LENGTH = 80
const OPTIONAL_TEXT_MAX_LENGTH = 500

const dateStringSchema = z.string().trim().min(1).refine(
  (value) => !Number.isNaN(new Date(value).getTime()),
  'must be a valid date string',
)

const titleSchema = z.string().trim().min(1, 'title is required').max(TITLE_MAX_LENGTH)
const optionalTextSchema = z.string().trim().max(OPTIONAL_TEXT_MAX_LENGTH).optional()
const nullableOptionalTextSchema = z.string().trim().max(OPTIONAL_TEXT_MAX_LENGTH).nullable().optional()

export const createEventSchema = z
  .object({
    title: titleSchema,
    startAt: dateStringSchema,
    endAt: dateStringSchema.optional(),
    reminderMinutesBefore: z.number().int().nonnegative().optional(),
    note: optionalTextSchema,
    sourceText: optionalTextSchema,
    status: eventStatusSchema.optional(),
  })
  .strict()

export const updateEventSchema = z
  .object({
    title: titleSchema.optional(),
    startAt: dateStringSchema.optional(),
    endAt: dateStringSchema.nullable().optional(),
    reminderMinutesBefore: z.number().int().nonnegative().nullable().optional(),
    note: nullableOptionalTextSchema,
    sourceText: nullableOptionalTextSchema,
    status: eventStatusSchema.optional(),
  })
  .strict()

export const eventQuerySchema = z
  .object({
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    status: z.union([eventStatusSchema, z.array(eventStatusSchema)]).optional(),
  })
  .strict()
