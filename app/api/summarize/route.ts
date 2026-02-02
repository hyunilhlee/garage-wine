import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: '요약할 글을 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('Generating summary and hook message...');

    // GPT-4o-mini로 요약 및 후킹 메시지 생성
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 와인 마케팅 전문가입니다.

블로그 글을 받으면 다음 두 가지를 생성해주세요:

1. **요약**: 400자 이내로 핵심 내용 요약
   - 와인의 주요 특징 (테루아, 품종, 테이스팅 노트)
   - 와이너리 핵심 정보
   - 구매 추천 이유

2. **후킹 메시지**: 2-4줄의 강렬한 구매 유도 메시지
   - 감성적이고 설득력 있게 작성
   - FOMO(Fear Of Missing Out) 자극
   - 구체적인 가치 제안 포함
   - 과장은 금지, 진정성 있게

## 응답 형식
다음 형식을 **정확히** 따라주세요:

=== 요약 ===
[400자 이내 요약]

=== 후킹 메시지 ===
[2-4줄의 구매 유도 메시지]`
        },
        {
          role: 'user',
          content: `다음 블로그 글을 요약하고 후킹 메시지를 만들어주세요:

${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const result = completion.choices[0]?.message?.content || '';

    // 요약과 후킹 메시지 파싱
    const summaryMatch = result.match(/===\s*요약\s*===\s*([\s\S]*?)(?====|$)/);
    const hookMatch = result.match(/===\s*후킹 메시지\s*===\s*([\s\S]*?)$/);

    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    const hookMessage = hookMatch ? hookMatch[1].trim() : '';

    return NextResponse.json({
      summary,
      hookMessage,
      usage: completion.usage
    });

  } catch (error: unknown) {
    console.error('Summary error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: `요약 생성 중 오류: ${errorMessage}` },
      { status: 500 }
    );
  }
}
