/**
 * API endpoint for managing chat threads collection.
 * Provides operations to list all threads and create new threads.
 * Uses Supabase for data persistence with enhanced error handling and logging.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Enhanced logging for environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseKey,
  urlLength: supabaseUrl?.length,
  keyLength: supabaseKey?.length,
  nodeEnv: process.env.NODE_ENV
});

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials:', {
    missingUrl: !supabaseUrl,
    missingKey: !supabaseKey
  });
}

const supabase = createClient(
  supabaseUrl!,
  supabaseKey!,
  {
    auth: {
      persistSession: false
    }
  }
);

export async function GET(req: NextRequest) {
  try {
    console.log('GET /api/threads - Attempting to fetch threads');
    
    // Test the connection first
    const { data: testData, error: testError } = await supabase
      .from('threads')
      .select('count')
      .limit(1);
      
    if (testError) {
      console.error('Supabase connection test failed:', {
        error: testError,
        code: testError.code,
        details: testError.details,
        hint: testError.hint,
        message: testError.message
      });
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: testError.message 
      }, { status: 500 });
    }

    // If connection test passes, proceed with the actual query
    const { data, error } = await supabase
      .from('threads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase GET error:', {
        error,
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      return NextResponse.json({ 
        error: 'Failed to fetch threads',
        details: error.message 
      }, { status: 500 });
    }

    console.log('GET /api/threads - Successfully fetched threads:', data?.length);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Unexpected error in GET /api/threads:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err.message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/threads - Starting request processing');
    
    // Log the raw request
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    
    let body;
    try {
      body = JSON.parse(rawBody);
      console.log('Parsed request body:', body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 });
    }
    
    if (!body.name) {
      console.error('Missing thread name in request');
      return NextResponse.json({ 
        error: 'Thread name is required',
        receivedBody: body 
      }, { status: 400 });
    }

    // Test the connection first
    const { error: testError } = await supabase
      .from('threads')
      .select('count')
      .limit(1);
      
    if (testError) {
      console.error('Supabase connection test failed:', {
        error: testError,
        code: testError.code,
        details: testError.details,
        hint: testError.hint,
        message: testError.message
      });
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: testError.message 
      }, { status: 500 });
    }

    console.log('Attempting to insert new thread:', { name: body.name });
    const { data, error } = await supabase
      .from('threads')
      .insert([{ name: body.name }])
      .select();
    
    if (error) {
      console.error('Supabase POST error:', {
        error,
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      return NextResponse.json({ 
        error: 'Failed to create thread',
        details: error.message 
      }, { status: 500 });
    }
    
    console.log('Successfully created thread:', data[0]);
    return NextResponse.json(data[0]);
  } catch (err: any) {
    console.error('Unexpected error in POST /api/threads:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err.message 
    }, { status: 500 });
  }
} 