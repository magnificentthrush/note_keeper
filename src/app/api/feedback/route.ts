import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user (optional - for logged-in users)
    const { data: { user } } = await supabase.auth.getUser();
    
    const body = await request.json();
    const { name, email, feedback_type, subject, message, rating, willing_to_pay, not_willing_reason } = body;

    // Validate required fields
    if (!message || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message is required and must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (!feedback_type) {
      return NextResponse.json(
        { error: 'Feedback type is required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Validate: If user says no to paying, reason must be provided
    if (willing_to_pay === false && (!not_willing_reason || not_willing_reason.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Please provide a reason if you are not willing to pay' },
        { status: 400 }
      );
    }

    // Insert feedback
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user?.id || null,
        name: name?.trim() || null,
        email: email?.trim() || user?.email || null,
        feedback_type,
        subject: subject?.trim() || null,
        message: message.trim(),
        rating: rating || null,
        willing_to_pay: willing_to_pay !== undefined ? willing_to_pay : null,
        not_willing_reason: willing_to_pay === false ? not_willing_reason?.trim() || null : null,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting feedback:', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      id: data.id,
    });
  } catch (error) {
    console.error('Error in POST /api/feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

