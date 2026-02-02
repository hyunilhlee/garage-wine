import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      currentContent,
      modifyRequest
    } = body;

    if (!currentContent || !modifyRequest) {
      return NextResponse.json(
        { error: '현재 글과 수정 요청을 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('Modifying content with gpt-4o-mini...');

    // gpt-4o-mini로 간단하게 수정
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 와인 블로그 글 편집 전문가입니다.

사용자의 수정 요청에 따라 기존 글을 수정해주세요.

## 수정 규칙
1. 사용자의 요청에 해당하는 부분만 수정하세요
2. 전체 구조와 형식은 유지하세요
3. 수정하지 않는 부분은 그대로 유지하세요
4. 이미지 마커 ([이미지N: ...])는 유지하세요
5. 섹션 구분 (=== ... ===)은 유지하세요

## 응답 형식
수정된 전체 글을 그대로 반환하세요. 설명이나 주석은 추가하지 마세요.`
        },
        {
          role: 'user',
          content: `다음 블로그 글을 수정해주세요.

=== 현재 글 ===
${currentContent}

=== 수정 요청 ===
${modifyRequest}

=== 수정된 전체 글을 작성해주세요 ===`
        }
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    const modifiedContent = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      content: modifiedContent,
      usage: completion.usage
    });

  } catch (error: unknown) {
    console.error('Modification error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: `수정 중 오류: ${errorMessage}` },
      { status: 500 }
    );
  }
}
