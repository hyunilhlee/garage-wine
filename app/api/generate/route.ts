import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { SYSTEM_PROMPT, CONTACT_TEMPLATE, EXAMPLE_POST } from '@/lib/prompts';

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

    // 글 길이 옵션
    const lengthGuide = {
      short: '\n\n글은 간결하게 작성해주세요. 도입부와 핵심 내용만 포함합니다.',
      normal: '',
      detailed: '\n\n글은 상세하게 작성해주세요. 와이너리 소개도 포함하고, 각 섹션을 풍부하게 작성합니다.'
    };
    userMessage += lengthGuide[length as keyof typeof lengthGuide] || '';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + '\n\n' + EXAMPLE_POST
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const generatedContent = completion.choices[0]?.message?.content || '';

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
