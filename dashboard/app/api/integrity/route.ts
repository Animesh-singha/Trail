import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const AI_HUB_URL = process.env.AI_HUB_URL || 'http://nexus-hub:3001';
  
  try {
    const res = await fetch(`${AI_HUB_URL}/v1/visibility/integrity`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('nexus_token')}` 
      }
    });
    
    if (!res.ok) throw new Error('Failed to fetch integrity logs from Hub');
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
