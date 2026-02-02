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

    // GPT-5-mini로 요약 및 후킹 메시지 생성 (Responses API 사용)
    const completion = await openai.responses.create({
      model: 'gpt-5-mini',
      input: [
        {
          role: 'system',
          content: `당신은 가라지와인의 마케팅 전문가입니다.

**중요: 아래 블로그 본문에 있는 내용만 사용하세요. 추측하거나 예상으로 작성하지 마세요.**

블로그 글을 받으면 다음 두 가지를 생성해주세요:

1. **요약**: 600-800자로 핵심 내용을 풍성하고 매력적으로 요약

   **필수 원칙:**
   - 본문에 명시된 정보만 사용
   - 본문에 없는 평점, 가격, 수량, 희소성 정보는 절대 작성 금지
   - 본문에 있는 구체적인 팩트 위주로 작성

   형식 가이드:
   - 첫 줄: [대괄호로 핵심 키워드 강조] (본문에서 추출)
   - 와이너리 명성과 배경 (본문에 명시된 내용만)
   - 평점 정보는 목록으로 깔끔하게 (본문에 명시된 것만)
     예:
     ★와인명 빈티지
     - VIVINO 4.2
     - Robert Parker 94p
     - James Suckling 94p
   - 이 와인만의 독특한 특징 (본문에 있는 내용만)
   - 빈티지 특성, 테루아 (본문에 명시된 내용만)
   - 테이스팅 특징 (본문에서 추출)
   - 친근하고 열정적인 톤 (^^, !) 적절히 사용

   **절대 금지:**
   - 본문에 없는 "단 48병", "한정판", "재입고 불가능" 등 창작 금지
   - "정보 없음", "확인되지 않았습니다" 등의 표현 사용 금지
   - 팩트체크 실패 언급 금지

2. **후킹 메시지**: VIP 고객을 실제로 구매하게 만드는 강력한 설득 메시지

   **필수 원칙:**
   - 본문에 명시된 정보만 사용
   - 본문에 없는 수량, 가격, 희소성 정보 창작 금지
   - 본문에 있는 팩트를 극대화하여 표현

   형식 가이드:
   - 첫 줄: "님~" 으로 시작하여 친근하면서도 긴급감 있게
   - "이 와인을 놓치시면 안 되는 이유를 말씀드립니다!" 같은 강한 후킹 문구
   - 번호로 정리된 강력한 구매 이유 3-5개 (본문의 구체적 정보 기반)
     예: (본문에 있는 내용으로만)
     1. 📍 [본문의 빈티지 특성] - [본문의 구체적 설명]
     2. ⏰ [본문의 숙성/음용 시기] - [본문의 구체적 설명]
     3. 🏆 [본문의 평점/수상] - [본문의 구체적 평가]
     4. 💎 [본문의 테루아/품질] - [본문의 구체적 특징]
     5. 💰 [본문의 가성비/가치] - [본문의 구체적 장점]

   - 각 이유마다 본문의 팩트를 바탕으로 설득
   - 열정적이고 확신에 찬 톤 (!!, ✨, 🔥 등 이모지 적극 사용)
   - 마지막: 행동 촉구 + 즉시 연락 유도

   **절대 금지:**
   - 본문에 없는 "단 48병", "재입고 불가능", "이번 달 품절" 등 창작 금지
   - 본문에 없는 가격 정보, 수량 정보 창작 금지
   - "정보 없음", "확인되지 않았습니다" 등의 표현 사용 금지
   - 추상적이거나 약한 표현 금지 ("좋은 와인입니다" 같은 말 금지)

## 응답 형식
다음 형식을 **정확히** 따라주세요:

=== 요약 ===
[600-800자 정도의 풍성하고 매력적인 요약]

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
