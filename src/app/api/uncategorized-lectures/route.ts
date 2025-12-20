import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET /api/uncategorized-lectures - Get all uncategorized lectures for current user
export async function GET() {
  try {
    const supabase = await createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: lectures, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('user_id', user.id)
      .is('folder_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching uncategorized lectures:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lectures: lectures || [] });
  } catch (error) {
    console.error('Error in GET /api/uncategorized-lectures:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



