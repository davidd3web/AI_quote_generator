// app/api/subscribe/route.tsx
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';
import { EmailTemplate } from '@/components/email/email-templates';
import * as React from 'react';

// **MODIFICATION HERE**
// Add 'quote' to the schema for the initial email.
const subscribeSchema = z.object({
  email: z.string().email(),
  quote: z.string(), // The initial quote to include in the confirmation
  famousPerson: z.string().optional(),
  tone: z.string().optional(),
  quoteType: z.string(),
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = subscribeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ message: "Invalid input.", errors: result.error.flatten() }, { status: 400 });
    }
    // **MODIFICATION HERE**
    // Destructure the 'quote' from the validated data
    const { email, quote, famousPerson, tone, quoteType } = result.data;

    const { data: subscriptionData, error: supabaseError } = await supabase
      .from('daily_subscriptions')
      .upsert({
        email,
        famous_person: famousPerson || null,
        tone: tone || null,
        quote_type: quoteType,
        is_active: true,
      }, { onConflict: 'email,famous_person,tone,quote_type' })
      .select()
      .single();

    if (supabaseError) {
      console.error("Supabase error:", supabaseError);
      return NextResponse.json({ message: "Could not save subscription." }, { status: 500 });
    }

    // **MODIFICATION HERE**
    // Pass the initial quote and a subscription message to the EmailTemplate
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data, error: sendError } = await resend.emails.send({
      from: 'Your AI Quote App <onboarding@resend.dev>', // CHANGE THIS
      to: [email],
      subject: 'You are subscribed to daily quotes!',
      react: <EmailTemplate 
               quote={quote} 
               subscriptionMessage="You'll start receiving a new quote every day. Thank you for subscribing!"
               unsubscribeUrl={`${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?id=${subscriptionData.id}`} 
             />,
    });

    if (sendError) {
      console.error("Resend API Error:", sendError);
      return NextResponse.json({ message: "Failed to send confirmation email.", errorDetails: sendError }, { status: 500 });
    }

    return NextResponse.json({ message: "Successfully subscribed! A confirmation email has been sent." });

  } catch (error) {
    console.error("Subscription API error:", error);
    return NextResponse.json({ message: "An internal server error occurred." }, { status: 500 });
  }
}
