// app/api/send-email/route.tsx
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
// Adjust the import path for your EmailTemplate component as necessary
import { EmailTemplate } from '@/components/email/email-templates';
import * as React from 'react'; // Import React to use JSX

// Zod schema for validating the request body for a one-time send
const sendEmailSchema = z.object({
    email: z.string().email({ message: "Invalid email address format." }),
    quote: z.string().min(5, { message: "Quote content is too short." }),
});

// Initialize Resend with your API key from .env.local
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

        console.log(`Attempting to send a one-time email via Resend to: ${recipientEmail}`);

        // Send email using Resend, passing the EmailTemplate as a React element (JSX)
        const { data, error: sendError } = await resend.emails.send({
            from: 'Your AI Quote App <onboarding@resend.dev>', // CHANGE THIS to your verified Resend 'from' address
            to: [recipientEmail],
            subject: 'Here is your AI Generated Quote!',
            react: <EmailTemplate quote={quote} />, // This is the line that requires the .tsx extension
        });

        if (sendError) {
            console.error("Resend API Error:", sendError);
            let errorMessage = "Failed to send email due to an issue with the email service.";
            if (sendError.message) {
                errorMessage = `Email service error: ${sendError.message}`;
            }
            return NextResponse.json({ message: errorMessage, errorDetails: sendError }, { status: 500 });
        }

        console.log("One-time email sent successfully via Resend:", data);
        return NextResponse.json({ message: "Quote sent successfully to your email!", data });

    } catch (error) {
        console.error("Error in send-email API route:", error);
        return NextResponse.json({ message: "An internal server error occurred." }, { status: 500 });
    }
}
