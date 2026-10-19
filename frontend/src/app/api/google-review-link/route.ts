import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { maps_url } = body;

    if (!maps_url || typeof maps_url !== 'string') {
      return NextResponse.json(
        { error: { message: 'maps_url wajib diisi' } },
        { status: 400 }
      );
    }

    const trimmed = maps_url.trim();

    // If the input is already a direct writereview link, return it directly
    if (trimmed.includes('search.google.com/local/writereview')) {
      const match = trimmed.match(/[?&]placeid=([^&#]+)/);
      return NextResponse.json({
        place_id: match ? match[1] : '',
        review_url: trimmed,
        verification: 'not_verified',
      });
    }

    const upstreamRes = await fetch('https://productmate.com/api/v1/google-review-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ maps_url: trimmed }),
    });

    const data = await upstreamRes.json();
    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          message: error.message || 'Gagal menghubungi server Productmate',
        },
      },
      { status: 500 }
    );
  }
}
