import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import {
  SYSTEM_PROMPT,
  CONTACT_TEMPLATE,
  LENGTH_CONFIGS,
  EXAMPLE_POST_SHORT,
  EXAMPLE_POST_MEDIUM
} from '@/lib/prompts';
import { searchWineFacts, verifyContent } from '@/lib/search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      wineName,
      region,
      vintage,
      variety,
      highlights,
      length = 'normal'
    } = body;

    if (!prompt && !wineName) {
      return NextResponse.json(
        { error: '와인 정보를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 입력 구성
    let userMessage = '';

    if (prompt) {
      userMessage = `다음 정보를 바탕으로 와인 홍보 블로그 글을 작성해주세요:\n\n${prompt}`;
    }

    // 추가 상세 정보가 있으면 포함
    if (wineName || region || vintage || variety) {
      userMessage += '\n\n추가 정보:';
      if (wineName) userMessage += `\n- 와인명: ${wineName}`;
      if (region) userMessage += `\n- 생산지역: ${region}`;
      if (vintage) userMessage += `\n- 빈티지: ${vintage}`;
      if (variety) userMessage += `\n- 품종: ${variety}`;
    }

    // 강조점 옵션
    if (highlights && highlights.length > 0) {
      userMessage += `\n\n강조해야 할 포인트: ${highlights.join(', ')}`;
    }

    // 글 길이 설정 (새 시스템)
    const lengthKey = (length as keyof typeof LENGTH_CONFIGS) || 'normal';
    const lengthConfig = LENGTH_CONFIGS[lengthKey] || LENGTH_CONFIGS.normal;

    // 길이별 예시 선택
    const examplePost = lengthKey === 'short' ? EXAMPLE_POST_SHORT : EXAMPLE_POST_MEDIUM;

    // 길이별 max_tokens 설정
    const maxTokens = {
      short: 2500,
      normal: 4000,
      detailed: 6000
    }[lengthKey] || 4000;

    // 길이 가이드 추가
    userMessage += `\n\n${lengthConfig.instruction}`;

    // 1단계: 와인 정보 팩트체크
    console.log('Step 1: Fact-checking wine information...');
    const { facts } = await searchWineFacts(userMessage);

    // 팩트 기반 프롬프트 강화
    const factBasedPrompt = `${SYSTEM_PROMPT}

## 중요: 팩트 기반 작성 원칙
- 아래 "검증된 정보"에 있는 내용만 사실로 작성하세요
- 검증된 정보에 없는 내용은 추측하지 마세요
- 확실하지 않은 수상내역, 평점은 포함하지 마세요
- 일반적인 와인/품종/지역 지식은 사용 가능합니다

=== 검증된 정보 ===
${facts || '검증된 정보 없음 - 일반적인 와인 지식만 사용하세요'}
===================

## 참고 예시 (${lengthConfig.label} 버전)
${examplePost}`;

    // 2단계: 팩트 기반 콘텐츠 생성
    console.log(`Step 2: Generating fact-based content (${lengthConfig.label}, ${maxTokens} tokens)...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: factBasedPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.5, // 일관성 향상
      max_tokens: maxTokens,
    });

    let generatedContent = completion.choices[0]?.message?.content || '';

    // 3단계: 생성된 콘텐츠 검증
    console.log('Step 3: Verifying generated content...');
    const verification = await verifyContent(generatedContent, facts);

    if (!verification.isValid && verification.issues.length > 0) {
      console.log('Content verification found issues, regenerating...');
      // 문제가 발견되면 한번 더 수정 요청
      const correctionResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
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
        temperature: 0.3,
        max_tokens: maxTokens,
      });

      generatedContent = correctionResponse.choices[0]?.message?.content || generatedContent;
    }

    // 문의 방법 템플릿 추가
    const finalContent = generatedContent + CONTACT_TEMPLATE;

    return NextResponse.json({
      content: finalContent,
      usage: completion.usage
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
