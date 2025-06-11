// app/api/cron/send-daily-quotes/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';
import { EmailTemplate } from '@/components/email/email-templates';
import * as React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to generate a new quote from Gemini
async function generateNewQuote(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error("Failed to fetch from Gemini API");
    }

    const result = await response.json();
    return result.candidates[0]?.content?.parts[0]?.text.trim() || "Could not generate a quote today. Please check back tomorrow.";
}

export async function GET() {
    try {
        // 1. Fetch all active subscriptions
        const { data: subscriptions, error } = await supabase
            .from('daily_subscriptions')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;
        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ message: "No active subscriptions to process." });
        }

        // 2. Process each subscription
        const emailPromises = subscriptions.map(async (sub) => {
            // a. Construct the prompt for Gemini
            let prompt = `Generate a quote about: "${sub.quote_type}".`;
            if (sub.tone) prompt += ` The tone should be ${sub.tone}.`;
            if (sub.famous_person) prompt += ` The quote should sound as if it were written or said by ${sub.famous_person}.`;
            prompt += "\n\nQuote:";

            // b. Generate a new quote
            const newQuote = await generateNewQuote(prompt);
            const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?id=${sub.id}`;

            // c. Send the email via Resend
            return resend.emails.send({
                from: 'Your AI Quote App <onboarding@resend.dev>', // CHANGE THIS
                to: [sub.email],
                subject: 'Your Daily AI Generated Quote!',
                react: <EmailTemplate quote={newQuote} unsubscribeUrl={unsubscribeUrl} />,
            });
        });

        // Wait for all emails to be sent
        const results = await Promise.allSettled(emailPromises);
        
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Failed to send email to ${subscriptions[index].email}:`, result.reason);
            } else {
                console.log(`Successfully sent email to ${subscriptions[index].email}`);
            }
        });

        return NextResponse.json({ message: `Processed ${results.length} subscriptions.` });

    } catch (error) {
        console.error("Cron job error:", error);
        return NextResponse.json({ message: "Error processing daily quotes.", error: (error as Error).message }, { status: 500 });
    }
}
