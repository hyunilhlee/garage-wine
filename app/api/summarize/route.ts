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

    // GPT-4o-mini로 요약 및 후킹 메시지 생성 (Responses API 사용)
    const completion = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content: `당신은 가라지와인의 마케팅 전문가입니다.

블로그 글을 받으면 다음 두 가지를 생성해주세요:

1. **요약**: 400자 정도로 핵심 내용을 매력적으로 요약

   형식 가이드:
   - 첫 줄: [대괄호로 핵심 키워드 강조] 예: [세계적인 그레이트 2015 빈티지 CDP]
   - 와이너리 명성과 배경 강조
   - 평점 정보는 목록으로 깔끔하게 (★로 시작, 하이픈으로 나열)
     예:
     ★와인명 빈티지
     - VIVINO 4.2
     - Robert Parker 94p
     - James Suckling 94p
   - 빈티지 특성, 테루아, 숙성 잠재력 등 핵심 가치
   - 가격 경쟁력이나 희소성 강조 (해당되는 경우)
   - 친근하고 열정적인 톤 (^^, !) 적절히 사용
   - 구체적인 수치와 팩트 포함

2. **후킹 메시지**: VIP 고객에게 보내는 개인화된 설득 메시지

   형식 가이드:
   - 첫 줄: "님~" 으로 시작하여 친근하게
   - "이 와인을 선택하셔야 하는 이유를 말씀 드립니다." 라는 문구 포함
   - 번호로 정리된 핵심 이유 3-5개
     예:
     1. 2015라는 역사적 빈티지
     2. 10년 숙성의 완성도
     3. 단일 포도밭의 정교함
   - 각 이유에 대한 상세 설명 (특히 독특한 특징 강조)
   - 가격대 언급 (가능한 경우, 일반 가격 vs 가라지 특별가)
   - 마지막: 한정 수량 + 강한 권유로 마무리
   - 열정적이고 확신에 찬 톤 (!!, 강조 표현 사용)

## 응답 형식
다음 형식을 **정확히** 따라주세요:

=== 요약 ===
[400자 정도의 매력적인 요약]

=== 후킹 메시지 ===
[VIP 고객 대상 개인화된 설득 메시지]`
        },
        {
          role: 'user',
          content: `다음 블로그 글을 가라지와인 스타일의 요약과 후킹 메시지로 변환해주세요:

${content}`
        }
      ],
    });

    const result = completion.output_text || '';

    // 요약과 후킹 메시지 파싱
    const summaryMatch = result.match(/===\s*요약\s*===\s*([\s\S]*?)(?====|$)/);
    const hookMatch = result.match(/===\s*후킹 메시지\s*===\s*([\s\S]*?)$/);

    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    const hookMessage = hookMatch ? hookMatch[1].trim() : '';

    return NextResponse.json({
      summary,
      hookMessage
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
