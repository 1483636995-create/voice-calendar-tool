import { z } from 'zod'

export const eventStatusSchema = z.enum(['scheduled', 'completed', 'cancelled'])

const dateStringSchema = z.string().trim().min(1).refine(
  (value) => !Number.isNaN(new Date(value).getTime()),
  'must be a valid date string',
)

const optionalTextSchema = z.string().trim().optional()

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, 'title is required'),
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
    title: z.string().trim().min(1, 'title cannot be empty').optional(),
    startAt: dateStringSchema.optional(),
    endAt: dateStringSchema.nullable().optional(),
    reminderMinutesBefore: z.number().int().nonnegative().nullable().optional(),
    note: z.string().trim().nullable().optional(),
    sourceText: z.string().trim().nullable().optional(),
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
