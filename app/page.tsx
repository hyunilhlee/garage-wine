'use client';

import { useState, useMemo } from 'react';
import ImageSelector from '@/components/ImageSelector';

type LengthOption = 'short' | 'normal' | 'detailed';
type ModelOption = 'gpt-5.2' | 'gpt-5-mini' | 'gpt-5-nano';
type Step = 'input' | 'writing' | 'images';

// 이미지 기능 활성화 플래그 (나중에 true로 변경하면 이미지 기능 활성화)
const ENABLE_IMAGE_FEATURE = false;

interface ImageState {
  [key: string]: string;
}

interface SkippedState {
  [key: string]: boolean;
}

// 모델별 가격 정보 (per 1M tokens)
const MODEL_PRICING = {
  'gpt-5.2': { input: 1.25, output: 10.0, label: 'GPT-5.2 (고품질)', description: '코딩 및 복잡한 작업에 최적화' },
  'gpt-5-mini': { input: 0.25, output: 2.0, label: 'GPT-5 mini (추천)', description: '빠르고 비용 효율적' },
  'gpt-5-nano': { input: 0.05, output: 0.4, label: 'GPT-5 nano (초저가)', description: '가장 빠르고 저렴한 옵션' },
} as const;

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [length, setLength] = useState<LengthOption>('detailed');
  const [model, setModel] = useState<ModelOption>('gpt-5-mini');
  const [highlights, setHighlights] = useState<string[]>([]);

  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImageState>({});
  const [skippedImages, setSkippedImages] = useState<SkippedState>({});
  const [currentStep, setCurrentStep] = useState<Step>('input');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [actualCost, setActualCost] = useState<number>(0);

  // 수정 기능 상태
  const [modifyRequest, setModifyRequest] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [modifyHistory, setModifyHistory] = useState<Array<{type: 'user' | 'assistant', content: string}>>([]);

  // 요약 기능 상태
  const [summary, setSummary] = useState('');
  const [hookMessage, setHookMessage] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const highlightOptions = [
    // 가격 관련
    { value: '가성비', label: '가성비', category: '가격' },
    { value: '프리미엄가치', label: '프리미엄 가치', category: '가격' },

    // 희소성 관련
    { value: '한정생산', label: '한정 생산', category: '희소성' },
    { value: '빈티지희귀성', label: '빈티지 희귀성', category: '희소성' },

    // 평가 관련
    { value: '평점수상', label: '평점/수상', category: '평가' },
    { value: '평론가호평', label: '평론가 호평', category: '평가' },

    // 스토리 관련
    { value: '와이너리역사', label: '와이너리 역사', category: '스토리' },
    { value: '생산자철학', label: '생산자 철학', category: '스토리' },
    { value: '테루아특별함', label: '테루아 특별함', category: '스토리' },

    // 품질 관련
    { value: '숙성잠재력', label: '장기 숙성 잠재력', category: '품질' },
    { value: '유기농', label: '유기농/바이오다이나믹', category: '품질' },
  ];

  const toggleHighlight = (value: string) => {
    setHighlights(prev =>
      prev.includes(value)
        ? prev.filter(h => h !== value)
        : [...prev, value]
    );
  };

  // 예상 비용 계산 (대략적인 토큰 수 추정)
  const calculateEstimatedCost = (selectedModel: ModelOption, selectedLength: LengthOption) => {
    const pricing = MODEL_PRICING[selectedModel];

    // 글 길이별 대략적인 토큰 수 추정
    const tokenEstimates = {
      short: { input: 800, output: 1500 },
      normal: { input: 1200, output: 2500 },
      detailed: { input: 1500, output: 4000 },
    };

    const estimate = tokenEstimates[selectedLength];
    const inputCost = (estimate.input / 1_000_000) * pricing.input;
    const outputCost = (estimate.output / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  };

  // 실제 비용 계산
  const calculateActualCost = (inputTokens: number, outputTokens: number, selectedModel: ModelOption) => {
    const pricing = MODEL_PRICING[selectedModel];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  };

  // 모델이나 길이가 변경될 때 예상 비용 업데이트
  useMemo(() => {
    const cost = calculateEstimatedCost(model, length);
    setEstimatedCost(cost);
  }, [model, length]);

  // 이미지 마커 파싱 - [이미지N: 설명] 형식
  const parsedContent = useMemo(() => {
    if (!result) return [];

    // [이미지1: 설명], [이미지2: 설명] 등의 패턴 매칭
    const imagePattern = /\[이미지\d+:\s*([^\]]+)\]/g;
    const parts: Array<{ type: 'text' | 'image'; content: string; id?: string }> = [];
    let lastIndex = 0;
    let match;
    let imageIndex = 0;

    while ((match = imagePattern.exec(result)) !== null) {
      // 이미지 마커 이전 텍스트
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: result.slice(lastIndex, match.index),
        });
      }

      // 이미지 마커
      parts.push({
        type: 'image',
        content: match[1].trim(),
        id: `img-${imageIndex}`,
      });

      lastIndex = match.index + match[0].length;
      imageIndex++;
    }

    // 마지막 텍스트
    if (lastIndex < result.length) {
      parts.push({
        type: 'text',
        content: result.slice(lastIndex),
      });
    }

    return parts;
  }, [result]);

  // 이미지 섹션 통계
  const imageStats = useMemo(() => {
    const imageParts = parsedContent.filter(p => p.type === 'image');
    const total = imageParts.length;
    const selected = imageParts.filter(p => selectedImages[p.id!]).length;
    const skipped = imageParts.filter(p => skippedImages[p.id!]).length;
    const remaining = total - selected - skipped;
    return { total, selected, skipped, remaining };
  }, [parsedContent, selectedImages, skippedImages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('와인 정보를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');
    setSelectedImages({});
    setSkippedImages({});
    setActualCost(0);
    setCurrentStep('writing');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          highlights,
          length,
          model, // 선택된 모델 전달
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '글 생성에 실패했습니다.');
      }

      setResult(data.content);

      // 실제 비용 계산
      if (data.usage) {
        const cost = calculateActualCost(
          data.usage.prompt_tokens || 0,
          data.usage.completion_tokens || 0,
          model
        );
        setActualCost(cost);
      }

      // 이미지 기능이 활성화된 경우에만 이미지 단계로 전환
      setCurrentStep(ENABLE_IMAGE_FEATURE ? 'images' : 'input');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setCurrentStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  // 복사 시 이미지 마커는 그대로 유지 (블로그 편집 시 참고용)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('복사에 실패했습니다.');
    }
  };

  const handleReset = () => {
    setResult('');
    setSelectedImages({});
    setSkippedImages({});
    setCurrentStep('input');
    setModifyHistory([]);
    setSummary('');
    setHookMessage('');
    setShowSummary(false);
  };

  // 수정 요청 핸들러
  const handleModify = async () => {
    if (!modifyRequest.trim()) {
      setError('수정 요청을 입력해주세요.');
      return;
    }

    setIsModifying(true);
    setError('');

    // 채팅 히스토리에 사용자 메시지 추가
    setModifyHistory(prev => [...prev, { type: 'user', content: modifyRequest }]);

    try {
      const response = await fetch('/api/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentContent: result,
          modifyRequest: modifyRequest
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '수정에 실패했습니다.');
      }

      // 결과 업데이트
      setResult(data.content);

      // 채팅 히스토리에 AI 응답 추가
      setModifyHistory(prev => [...prev, {
        type: 'assistant',
        content: '✓ 수정이 완료되었습니다. 위 내용을 확인해주세요.'
      }]);

      // 입력 필드 초기화
      setModifyRequest('');

    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.');
      // 에러 메시지도 히스토리에 추가
      setModifyHistory(prev => [...prev, {
        type: 'assistant',
        content: `❌ 오류: ${err instanceof Error ? err.message : '수정에 실패했습니다.'}`
      }]);
    } finally {
      setIsModifying(false);
    }
  };

  // 요약 생성 핸들러
  const handleSummarize = async () => {
    setIsSummarizing(true);
    setError('');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: result
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '요약 생성에 실패했습니다.');
      }

      setSummary(data.summary);
      setHookMessage(data.hookMessage);
      setShowSummary(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : '요약 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleImageSkip = (imageId: string) => {
    setSkippedImages(prev => ({
      ...prev,
      [imageId]: !prev[imageId], // 토글
    }));
    // 스킵하면 선택된 이미지도 제거
    if (!skippedImages[imageId]) {
      setSelectedImages(prev => {
        const newState = { ...prev };
        delete newState[imageId];
        return newState;
      });
    }
  };

  const handleImageSelect = (imageId: string, imageUrl: string) => {
    setSelectedImages(prev => ({
      ...prev,
      [imageId]: imageUrl,
    }));
  };

  return (
    <main className="max-w-4xl mx-auto p-6">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          가라지와인 블로그 글쓰기 AI
        </h1>
        <p className="text-gray-600">
          와인 정보를 입력하면 블로그 세일즈 글을 자동으로 생성합니다
        </p>

        {/* 단계 표시 - 이미지 기능 활성화시에만 2단계 표시 */}
        {ENABLE_IMAGE_FEATURE ? (
          <div className="flex justify-center gap-4 mt-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              currentStep === 'input' ? 'bg-purple-600 text-white' :
              currentStep === 'writing' || currentStep === 'images' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">1</span>
              글 작성
            </div>
            <div className="flex items-center text-gray-400">→</div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              currentStep === 'images' ? 'bg-purple-600 text-white' :
              currentStep === 'writing' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">2</span>
              이미지 추가
            </div>
          </div>
        ) : (
          <div className="flex justify-center gap-4 mt-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              currentStep === 'input' ? 'bg-purple-600 text-white' : 'bg-green-100 text-green-700'
            }`}>
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</span>
              AI 글 생성
            </div>
          </div>
        )}
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 mb-6">
        {/* 자연어 입력 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            와인 정보를 자유롭게 입력해주세요
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: 샤토 마고 2018, 프랑스 보르도, 카베르네 소비뇽 주품종. 우아하고 고급스러운 느낌으로 작성해줘. VIVINO 4.5점, 로버트 파커 95점"
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          <p className="mt-2 text-xs text-gray-500">
            💡 팁: 와인명, 빈티지, 지역, 품종, 평점 등을 자세히 입력할수록 더 정확한 글이 생성됩니다.
          </p>
        </div>

        {/* AI 모델 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">AI 모델 선택</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(MODEL_PRICING) as ModelOption[]).map((modelKey) => {
              const modelInfo = MODEL_PRICING[modelKey];
              const cost = calculateEstimatedCost(modelKey, length);
              return (
                <button
                  key={modelKey}
                  type="button"
                  onClick={() => setModel(modelKey)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    model === modelKey
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-300 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-gray-800">{modelInfo.label}</span>
                    {model === modelKey && (
                      <span className="text-purple-600 text-sm">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{modelInfo.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      ~${cost.toFixed(4)}
                    </span>
                    <span className="text-xs text-gray-500">/ 예상</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    입력: ${modelInfo.input}/1M · 출력: ${modelInfo.output}/1M
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 옵션 */}
        <div className="flex flex-wrap gap-6 mb-6">
          {/* 글 길이 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">글 길이</label>
            <div className="flex gap-2">
              {[
                { value: 'short', label: '짧게' },
                { value: 'normal', label: '보통' },
                { value: 'detailed', label: '상세' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLength(option.value as LengthOption)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    length === option.value
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 강조점 */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-3">강조점 (복수 선택 가능)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['가격', '희소성', '평가', '스토리', '품질'].map((category) => (
                <div key={category} className="border border-gray-200 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-600 mb-2">{category}</h4>
                  <div className="flex flex-col gap-1">
                    {highlightOptions
                      .filter(opt => opt.category === category)
                      .map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleHighlight(option.value)}
                          className={`px-3 py-1.5 rounded text-sm border transition-colors text-left ${
                            highlights.includes(option.value)
                              ? 'bg-purple-100 text-purple-700 border-purple-400'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                          }`}
                        >
                          {highlights.includes(option.value) && '✓ '}
                          {option.label}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-4 rounded-lg text-white font-medium transition-colors ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              글 생성 중...
            </span>
          ) : (
            '글 생성하기'
          )}
        </button>
      </form>

      {/* 결과 표시 */}
      {result && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {ENABLE_IMAGE_FEATURE && currentStep === 'images' ? '2단계: 이미지 추가' : '생성된 글'}
              </h2>
              {actualCost > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  실제 비용: <span className="font-semibold text-purple-600">${actualCost.toFixed(4)}</span>
                  {' '}(예상: ${estimatedCost.toFixed(4)})
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {copied ? '✓ 복사됨' : '텍스트 복사'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                처음부터
              </button>
            </div>
          </div>

          {/* 이미지 진행 상황 - 기능 활성화시에만 표시 */}
          {ENABLE_IMAGE_FEATURE && imageStats.total > 0 && (
            <div className="mb-4 p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-purple-800">이미지 섹션 진행률</span>
                <span className="text-sm text-purple-600">
                  {imageStats.selected + imageStats.skipped} / {imageStats.total} 완료
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${((imageStats.selected + imageStats.skipped) / imageStats.total) * 100}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-600">✓ 선택: {imageStats.selected}</span>
                <span className="text-gray-500">⏭️ 스킵: {imageStats.skipped}</span>
                <span className="text-purple-600">○ 남음: {imageStats.remaining}</span>
              </div>
            </div>
          )}

          {/* 이미지 기능 비활성화 안내 */}
          {!ENABLE_IMAGE_FEATURE && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>이미지 추가 기능은 현재 비활성화되어 있습니다.</strong>
                {' '}기능을 활성화하려면 개발자에게 "이미지 추가 기능" 활성화를 요청하세요.
              </p>
            </div>
          )}

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-[800px] overflow-y-auto">
            {ENABLE_IMAGE_FEATURE ? (
              // 이미지 기능 활성화: 이미지 마커 파싱 및 ImageSelector 표시
              parsedContent.map((part, index) => {
                if (part.type === 'text') {
                  return (
                    <div key={index} className="result-content whitespace-pre-wrap">
                      {part.content}
                    </div>
                  );
                } else {
                  return (
                    <ImageSelector
                      key={part.id}
                      placeholder={part.content}
                      selectedImage={selectedImages[part.id!]}
                      isSkipped={skippedImages[part.id!]}
                      onSelect={(url) => handleImageSelect(part.id!, url)}
                      onSkip={() => handleImageSkip(part.id!)}
                    />
                  );
                }
              })
            ) : (
              // 이미지 기능 비활성화: 그냥 텍스트만 표시
              <div className="result-content whitespace-pre-wrap">
                {result}
              </div>
            )}
          </div>

          {/* 이미지 선택 안내 - 기능 활성화시에만 표시 */}
          {ENABLE_IMAGE_FEATURE && imageStats.remaining > 0 && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              보라색 박스를 클릭하여 이미지를 선택하거나, 스킵할 수 있습니다
            </p>
          )}

          {/* 모든 이미지 처리 완료 - 기능 활성화시에만 표시 */}
          {ENABLE_IMAGE_FEATURE && imageStats.total > 0 && imageStats.remaining === 0 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg text-center">
              <p className="text-green-700 font-medium">
                모든 이미지 섹션이 처리되었습니다! 텍스트를 복사하여 블로그에 붙여넣기 하세요.
              </p>
            </div>
          )}

          {/* 수정 채팅 인터페이스 */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">글 수정하기</h3>

            {/* 채팅 히스토리 */}
            {modifyHistory.length > 0 && (
              <div className="mb-4 max-h-60 overflow-y-auto space-y-2 p-4 bg-gray-50 rounded-lg">
                {modifyHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.type === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 수정 요청 입력 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={modifyRequest}
                onChange={(e) => setModifyRequest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isModifying && handleModify()}
                placeholder="예: 테이스팅 노트 부분을 더 구체적으로 작성해줘"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isModifying}
              />
              <button
                onClick={handleModify}
                disabled={isModifying || !modifyRequest.trim()}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isModifying || !modifyRequest.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isModifying ? '수정 중...' : '수정'}
              </button>
            </div>
          </div>

          {/* 요약 생성 버튼 */}
          <div className="mt-6 border-t pt-6">
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className={`w-full py-4 rounded-lg font-semibold transition-colors ${
                isSummarizing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSummarizing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  요약 생성 중...
                </span>
              ) : (
                '✓ 검토 완료 - 요약 및 후킹 메시지 생성'
              )}
            </button>

            {/* 요약 결과 표시 */}
            {showSummary && (
              <div className="mt-4 space-y-4">
                {/* 요약 */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">📝 요약 (400자 이내)</h4>
                  <p className="text-gray-800 whitespace-pre-wrap">{summary}</p>
                </div>

                {/* 후킹 메시지 */}
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">🔥 후킹 메시지</h4>
                  <p className="text-gray-800 whitespace-pre-wrap font-medium">{hookMessage}</p>
                </div>

                {/* 복사 버튼들 */}
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(summary);
                      alert('요약이 복사되었습니다!');
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    요약 복사
                  </button>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(hookMessage);
                      alert('후킹 메시지가 복사되었습니다!');
                    }}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    후킹 메시지 복사
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
