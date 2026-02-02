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

1. **요약**: 600-800자로 핵심 내용을 풍성하고 매력적으로 요약

   형식 가이드:
   - 첫 줄: [대괄호로 핵심 키워드 강조] 예: [세계적인 그레이트 2015 빈티지 CDP]
   - 와이너리 명성과 배경을 구체적으로 강조 (설립 연도, 유명 와인메이커, 수상 이력 등)
   - 평점 정보는 목록으로 깔끔하게 (★로 시작, 하이픈으로 나열)
     예:
     ★와인명 빈티지
     - VIVINO 4.2
     - Robert Parker 94p
     - James Suckling 94p
   - 이 와인만의 독특한 특징 강조 (올드바인, 단일 포도밭, 특별한 양조 방식 등)
   - 빈티지 특성, 테루아, 숙성 잠재력 등 핵심 가치를 구체적으로
   - 테이스팅 특징을 간략하게 포함 (대표 향, 풍미)
   - 가격 경쟁력이나 희소성을 구체적으로 강조 (해당되는 경우)
   - 친근하고 열정적인 톤 (^^, !) 적절히 사용
   - 구체적인 수치와 팩트 포함

   **절대 금지:**
   - "정보 없음", "확인되지 않았습니다" 등의 표현 사용 금지
   - 팩트체크 실패 언급 금지

2. **후킹 메시지**: VIP 고객을 실제로 구매하게 만드는 강력한 설득 메시지

   형식 가이드:
   - 첫 줄: "님~" 으로 시작하여 친근하면서도 긴급감 있게
   - "이 와인을 놓치시면 안 되는 이유를 말씀드립니다!" 같은 강한 후킹 문구
   - 번호로 정리된 강력한 구매 이유 3-5개 (구체적인 수치와 희소성 강조)
     예:
     1. 📍 2015라는 역사적 빈티지 - 100년에 한 번 나올까 말까한 완벽한 작황
     2. ⏰ 10년 숙성의 완성도 - 지금이 음용 최적기, 이후 가격은 2배 이상
     3. 💎 전 세계 단 500병만 배정 - 한국 입고는 48병이 전부
     4. 🏆 파커 96점 + 서클링 97점 - 두 거장이 동시에 극찬한 보기 드문 사례
     5. 💰 현재가 vs 향후가 - 1년 후엔 최소 30% 상승 예상

   - 각 이유마다 왜 "지금 바로" 사야 하는지 긴박감 조성
   - 구체적인 비교 데이터 포함 (다른 와인 가격, 과거 빈티지 가격 추이 등)
   - FOMO(Fear of Missing Out) 자극: "이번 달 안에 품절 예상", "재입고 불가능" 등
   - 마지막: 행동 촉구 + 즉시 연락 유도
     예: "지금 바로 연락 주시면 VIP 특별가로 안내드립니다!", "오늘 오후 5시까지만 이 가격입니다!"

   - 열정적이고 확신에 찬 톤 (!!, ✨, 🔥 등 이모지 적극 사용)
   - 고급스러우면서도 긴급한 느낌

   **절대 금지:**
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
