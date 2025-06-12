// app/api/auth/check-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Import the admin client from your Supabase helper.
import { supabase } from '@/lib/supabase';

const emailSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = emailSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ message: "Invalid email format." }, { status: 400 });
    }

    const { email } = result.data;

    // Call the database function 'email_exists' that we created in Supabase.
    // This is a robust way to check for existence that bypasses JS library inconsistencies.
    const { data: exists, error } = await supabase.rpc('email_exists', {
      user_email: email,
    });

    if (error) {
      // Handle unexpected errors from Supabase
      console.error("Supabase RPC error (email_exists):", error.message);
      return NextResponse.json({ message: "Error checking email." }, { status: 500 });
    }
    
    // The 'exists' variable will be true or false based on the function's result.
    return NextResponse.json({ exists: exists });

  } catch (e) {
    console.error("Check-email API error:", e);
    return NextResponse.json({ message: "An internal server error occurred." }, { status: 500 });
  }
}
