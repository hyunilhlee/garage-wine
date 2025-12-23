import { NextRequest, NextResponse } from 'next/server';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: '검색어를 입력해주세요.' }, { status: 400 });
  }

  // Unsplash API 키가 없으면 기본 와인 이미지 반환
  if (!UNSPLASH_ACCESS_KEY) {
    return NextResponse.json({
      results: getDefaultWineImages(query),
      source: 'default'
    });
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' wine')}&per_page=8&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Unsplash API error');
    }

    const data = await response.json();

    const results = data.results.map((img: {
      id: string;
      urls: { small: string; regular: string };
      alt_description: string | null;
      user: { name: string };
    }) => ({
      id: img.id,
      thumb: img.urls.small,
      regular: img.urls.regular,
      alt: img.alt_description || query,
      credit: img.user.name,
    }));

    return NextResponse.json({ results, source: 'unsplash' });
  } catch {
    return NextResponse.json({
      results: getDefaultWineImages(query),
      source: 'default'
    });
  }
}

function getDefaultWineImages(query: string) {
  // 키워드에 따른 기본 Unsplash 이미지 URL
  const wineImages = [
    {
      id: '1',
      thumb: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400',
      regular: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
      alt: '레드 와인',
      credit: 'Unsplash'
    },
    {
      id: '2',
      thumb: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=400',
      regular: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=800',
      alt: '와인 셀러',
      credit: 'Unsplash'
    },
    {
      id: '3',
      thumb: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400',
      regular: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800',
      alt: '포도밭',
      credit: 'Unsplash'
    },
    {
      id: '4',
      thumb: 'https://images.unsplash.com/photo-1567529692333-de9fd6772897?w=400',
      regular: 'https://images.unsplash.com/photo-1567529692333-de9fd6772897?w=800',
      alt: '와인 따르기',
      credit: 'Unsplash'
    },
    {
      id: '5',
      thumb: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400',
      regular: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800',
      alt: '화이트 와인',
      credit: 'Unsplash'
    },
    {
      id: '6',
      thumb: 'https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=400',
      regular: 'https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=800',
      alt: '와인과 치즈',
      credit: 'Unsplash'
    },
  ];

  return wineImages;
}
