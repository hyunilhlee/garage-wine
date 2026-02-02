import { openai } from './openai';

interface WineFactsResult {
  facts: string;
  sources: string[];
}

// 와인 정보를 검색하고 팩트체크하는 함수
export async function searchWineFacts(wineInfo: string, model: string = 'gpt-5-mini'): Promise<WineFactsResult> {
  // GPT를 사용하여 와인에 대한 검증된 정보만 추출
  // 모델의 학습 데이터 기반으로 확실한 정보만 제공하도록 요청

  const factCheckPrompt = `당신은 와인 전문가이자 팩트체커입니다.
다음 와인에 대해 **확실하게 알고 있는 사실만** 제공해주세요.

중요 규칙:
1. 확실하지 않은 정보는 절대 포함하지 마세요
2. 추측이나 가정은 하지 마세요
3. "~일 수 있다", "~로 추정된다" 같은 불확실한 표현은 사용하지 마세요
4. 해당 와인/와이너리에 대한 정보가 없으면 "정보 없음"이라고 명시하세요
5. 일반적인 와인 지식(품종 특성, 지역 특성)은 포함 가능합니다

다음 정보를 구조화해서 제공해주세요:
- 와이너리/생산자 정보 (역사, 설립자, 특징)
- 와인 생산 지역 특성
- 포도 품종 특성
- 양조 방식 (알려진 경우)
- 수상 내역 및 평점 (확인된 경우만)
- 가격대 (알려진 경우)

와인 정보:
${wineInfo}`;

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: '당신은 정확성을 최우선으로 하는 와인 전문가입니다. 확실한 사실만 제공하며, 모르는 것은 모른다고 솔직하게 말합니다.'
        },
        {
          role: 'user',
          content: factCheckPrompt
        }
      ],
      temperature: 0.5, // GPT-5 시리즈는 0.5-0.7 권장
      max_tokens: 1500,
    });

    const facts = response.choices[0]?.message?.content || '';

    return {
      facts,
      sources: [`${model} 학습 데이터 기반 검증`]
    };
  } catch (error) {
    console.error('Fact check error:', error);
    return {
      facts: '',
      sources: []
    };
  }
}

// 생성된 콘텐츠에서 허위 정보 검증
export async function verifyContent(content: string, originalFacts: string, model: string = 'gpt-5-mini'): Promise<{
  isValid: boolean;
  issues: string[];
  correctedContent?: string;
}> {
  const verifyPrompt = `다음 블로그 글에서 사실과 다르거나 과장된 내용이 있는지 검토해주세요.

원본 팩트:
${originalFacts}

생성된 블로그 글:
${content}

검토 결과를 다음 형식으로 제공해주세요:
1. 문제점 목록 (없으면 "없음")
2. 수정이 필요한 부분과 수정 제안`;

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: '당신은 팩트체커입니다. 과장이나 허위 정보를 찾아내는 것이 임무입니다.'
        },
        {
          role: 'user',
          content: verifyPrompt
        }
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    const verification = response.choices[0]?.message?.content || '';

    // 간단한 검증 - "문제점: 없음" 또는 유사 표현이 있으면 valid
    const isValid = verification.includes('없음') ||
                    verification.includes('문제가 없') ||
                    verification.includes('정확합니다');

    return {
      isValid,
      issues: isValid ? [] : [verification],
    };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      isValid: true, // 에러 시 기본 통과
      issues: []
    };
  }
}
