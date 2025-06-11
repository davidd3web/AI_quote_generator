import { z } from 'zod'

export const quoteFormSchema = z.object({
    famousPerson: z.string()
    .max(100, { message: "Name cannot exceed 100 characters." }) 
    .optional()
    .describe("The name of a famous person to emulate for the quote (optional)."), 

    tone: z.string()
    .max(50, { message: "Tone cannot exceed 50 characters." }) 
    .optional()
    .describe("The desired tone of the quote (e.g., inspirational, humorous, profound) (optional)."),

    quoteType: z.string()
    .min(10, { message: "Please describe the type of quote in at least 10 characters." }) 
    .max(500, { message: "Description cannot exceed 500 characters." })
    .describe("A description of the type of quote you want (e.g., 'a quote about perseverance for entrepreneurs', 'a witty remark about Mondays')."),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;