// app/api/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse("<h1>Invalid Request</h1><p>Subscription ID is missing.</p>", { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const { error } = await supabase
      .from('daily_subscriptions')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error("Unsubscribe error:", error);
      return new NextResponse("<h1>Error</h1><p>Could not process your unsubscribe request. Please try again later.</p>", { status: 500, headers: { 'Content-Type': 'text/html' } });
    }

    // Return a simple HTML page for confirmation
    return new NextResponse(
      "<h1>Unsubscribed</h1><p>You have been successfully unsubscribed from daily quotes.</p>",
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error("Server error during unsubscribe:", error);
    return new NextResponse("<h1>Server Error</h1><p>An unexpected error occurred.</p>", { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}
