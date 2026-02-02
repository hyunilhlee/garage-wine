import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import {
  SYSTEM_PROMPT,
  CONTACT_TEMPLATE,
  LENGTH_CONFIGS,
  EXAMPLE_POST
} from '@/lib/prompts';
import { searchWineFacts, verifyContent } from '@/lib/search';

// 모델 ID 매핑 (실제 OpenAI API 모델명으로 변환)
const MODEL_ID_MAP: { [key: string]: string } = {
  'gpt-5.2': 'gpt-5.2',
  'gpt-5-mini': 'gpt-5-mini',
  'gpt-5-nano': 'gpt-5-nano',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      highlights,
      length = 'normal',
      model = 'gpt-5-mini' // 기본값: gpt-5-mini
    } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: '와인 정보를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 입력 구성
    let userMessage = `다음 정보를 바탕으로 와인 홍보 블로그 글을 작성해주세요:\n\n${prompt}`;

    // 강조점 옵션
    if (highlights && highlights.length > 0) {
      userMessage += `\n\n특별히 강조해야 할 포인트: ${highlights.join(', ')}`;
    }

    // 글 길이 설정 (새 시스템)
    const lengthKey = (length as keyof typeof LENGTH_CONFIGS) || 'normal';
    const lengthConfig = LENGTH_CONFIGS[lengthKey] || LENGTH_CONFIGS.normal;

    // 길이별 max_tokens 설정
    const maxTokens = {
      short: 2500,
      normal: 4000,
      detailed: 6000
    }[lengthKey] || 4000;

    // 길이 가이드 추가
    userMessage += `\n\n${lengthConfig.instruction}`;

    // 선택된 모델 ID 가져오기
    const selectedModelId = MODEL_ID_MAP[model] || 'gpt-5-mini';
    console.log(`Using model: ${selectedModelId}`);

    // 1단계: 와인 정보 팩트체크
    console.log('Step 1: Fact-checking wine information...');
    const { facts } = await searchWineFacts(userMessage, selectedModelId);

    // 팩트 기반 프롬프트 강화
    const factBasedPrompt = `${SYSTEM_PROMPT}

## 중요: 팩트 기반 작성 원칙
- 아래 "검증된 정보"에 있는 내용만 사실로 작성하세요
- 검증된 정보에 없는 내용은 추측하지 마세요
- 확실하지 않은 수상내역, 평점은 포함하지 마세요
- 일반적인 와인/품종/지역 지식은 사용 가능합니다

**절대 금지 표현:**
- "정보 없음", "확인되지 않았습니다", "본 자료에서 확인되지 않았습니다" 등의 표현을 글에 절대 포함하지 마세요
- 팩트체크 실패 내용을 독자에게 보여주지 마세요
- 확인되지 않은 정보는 자연스럽게 생략하거나 일반적인 지역/품종 특성으로 대체하세요

=== 검증된 정보 ===
${facts || '검증된 정보 없음 - 일반적인 와인 지식만 사용하세요'}
===================

## 참고 예시 (${lengthConfig.label} 버전)
${EXAMPLE_POST}`;

    // 2단계: 팩트 기반 콘텐츠 생성
    console.log(`Step 2: Generating fact-based content (${lengthConfig.label}, model: ${selectedModelId})...`);
    const completion = await openai.responses.create({
      model: selectedModelId,
      input: [
        {
          role: 'system',
          content: factBasedPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
    });

    let generatedContent = completion.output_text || '';

    // 3단계: 생성된 콘텐츠 검증
    console.log('Step 3: Verifying generated content...');
    const verification = await verifyContent(generatedContent, facts, selectedModelId);

    if (!verification.isValid && verification.issues.length > 0) {
      console.log('Content verification found issues, regenerating...');
      // 문제가 발견되면 한번 더 수정 요청
      const correctionResponse = await openai.responses.create({
        model: selectedModelId,
        input: [
          {
            role: 'system',
            content: '당신은 팩트체커입니다. 블로그 글에서 과장되거나 확인되지 않은 내용을 수정해주세요.'
          },
          {
            role: 'user',
            content: `다음 블로그 글에서 발견된 문제를 수정해주세요.

문제점:
${verification.issues.join('\n')}

원본 글:
${generatedContent}

수정된 전체 글을 작성해주세요. 구조와 형식은 유지하되, 문제가 된 부분만 수정하거나 삭제하세요.`
          }
        ],
      });

      generatedContent = correctionResponse.output_text || generatedContent;
    }

    // 문의 방법 템플릿 추가
    const finalContent = generatedContent + CONTACT_TEMPLATE;

    return NextResponse.json({
      content: finalContent,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    });

  } catch (error: unknown) {
    console.error('Generation error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('API key') || errorMessage.includes('apiKey')) {
      return NextResponse.json(
        { error: `OpenAI API 키 오류: ${errorMessage}` },
        { status: 500 }
      );
    }

    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'OpenAI API 키가 유효하지 않습니다. 키를 확인해주세요.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `글 생성 중 오류: ${errorMessage}` },
      { status: 500 }
    );
  }
}
