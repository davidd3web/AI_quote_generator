// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
// Adjust the import path for your EmailTemplate component as necessary
import { EmailTemplate } from '@/components/email/email-templates'; // Assuming this path

// Zod schema for validating the request body
const sendEmailSchema = z.object({
    email: z.string().email({ message: "Invalid email address format." }),
    quote: z.string().min(5, { message: "Quote content is too short." }),
});

// Initialize Resend with your API key from .env.local
// Ensure RESEND_API_KEY is set in your environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate incoming data
        const validationResult = sendEmailSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { message: "Invalid input.", errors: validationResult.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { email: recipientEmail, quote } = validationResult.data;

        console.log(`Attempting to send email via Resend to: ${recipientEmail}`);
        console.log(`Quote content: ${quote}`);

        // --- Send email using Resend ---
        const { data, error: sendError } = await resend.emails.send({
            // IMPORTANT: Replace with your verified sender email address in Resend
            // This could be something like 'noreply@yourdomain.com' or 'quotes@yourdomain.com'
            // Using "onboarding@resend.dev" is for Resend's testing and will likely not work for your users
            // unless you specifically set it up that way.
            from: 'Your AI Quote App <onboarding@resend.dev>', // CHANGE THIS to your verified Resend 'from' address
            to: [recipientEmail], // The recipient's email from the form
            subject: 'Your AI Generated Quote!',
            react: EmailTemplate({ quote: quote }), // Pass the quote to your EmailTemplate component
        });

        if (sendError) {
            console.error("Resend API Error:", sendError);
            // Provide a more user-friendly message if possible, or log the specific error for debugging
            let errorMessage = "Failed to send email due to an issue with the email service.";
            if (sendError.message) {
                 // Resend errors often have a 'message' and sometimes a 'name' (e.g., 'validation_error')
                errorMessage = `Email service error: ${sendError.message}`;
            }
            return NextResponse.json({ message: errorMessage, errorDetails: sendError }, { status: 500 });
        }

        console.log("Email sent successfully via Resend:", data);
        return NextResponse.json({ message: "Quote sent successfully to your email!", data });

    } catch (error) {
        console.error("Error in send-email API route (outside Resend call):", error);
        if (error instanceof z.ZodError) { 
            return NextResponse.json({ message: "Invalid request body structure.", errors: error.flatten().fieldErrors }, { status: 400 });
        }
        return NextResponse.json({ message: "An internal server error occurred processing your request." }, { status: 500 });
    }
}
