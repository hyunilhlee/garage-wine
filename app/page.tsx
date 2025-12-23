'use client';

import { useState, useMemo } from 'react';
import ImageSelector from '@/components/ImageSelector';

type LengthOption = 'short' | 'normal' | 'detailed';
type Step = 'input' | 'writing' | 'images';

interface ImageState {
  [key: string]: string;
}

interface SkippedState {
  [key: string]: boolean;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [wineName, setWineName] = useState('');
  const [region, setRegion] = useState('');
  const [vintage, setVintage] = useState('');
  const [variety, setVariety] = useState('');
  const [length, setLength] = useState<LengthOption>('normal');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImageState>({});
  const [skippedImages, setSkippedImages] = useState<SkippedState>({});
  const [currentStep, setCurrentStep] = useState<Step>('input');

  const highlightOptions = [
    { value: '가성비', label: '가성비' },
    { value: '희소성', label: '희소성' },
    { value: '평점', label: '평점/수상' },
    { value: '와이너리스토리', label: '와이너리 스토리' },
  ];

  const toggleHighlight = (value: string) => {
    setHighlights(prev =>
      prev.includes(value)
        ? prev.filter(h => h !== value)
        : [...prev, value]
    );
  };

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
    if (!prompt && !wineName) {
      setError('와인 정보를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');
    setSelectedImages({});
    setSkippedImages({});
    setCurrentStep('writing');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          wineName,
          region,
          vintage,
          variety,
          highlights,
          length,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '글 생성에 실패했습니다.');
      }

      setResult(data.content);
      setCurrentStep('images'); // 글 생성 완료 후 이미지 단계로 전환
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

        {/* 단계 표시 */}
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
            placeholder="예: 샤토 마고 2018, 프랑스 보르도, 우아하고 고급스러운 느낌으로 작성해줘. VIVINO 4.5점"
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
        </div>

        {/* 상세 정보 토글 */}
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center text-purple-600 hover:text-purple-700 mb-4"
        >
          <span className="mr-2">{showDetails ? '▼' : '▶'}</span>
          상세 정보 입력 (선택)
        </button>

        {/* 상세 입력 폼 */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">와인명</label>
              <input
                type="text"
                value={wineName}
                onChange={(e) => setWineName(e.target.value)}
                placeholder="예: 샤토 마고"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">빈티지</label>
              <input
                type="text"
                value={vintage}
                onChange={(e) => setVintage(e.target.value)}
                placeholder="예: 2018"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">생산지역</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예: 프랑스 > 보르도 > 마고"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">품종</label>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="예: 카베르네 소비뇽, 메를로"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">강조점</label>
            <div className="flex flex-wrap gap-2">
              {highlightOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleHighlight(option.value)}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
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
            <h2 className="text-xl font-semibold text-gray-800">
              {currentStep === 'images' ? '2단계: 이미지 추가' : '생성된 글'}
            </h2>
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

          {/* 이미지 진행 상황 */}
          {imageStats.total > 0 && (
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

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-[800px] overflow-y-auto">
            {parsedContent.map((part, index) => {
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
            })}
          </div>

          {/* 이미지 선택 안내 */}
          {imageStats.remaining > 0 && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              보라색 박스를 클릭하여 이미지를 선택하거나, 스킵할 수 있습니다
            </p>
          )}

          {/* 모든 이미지 처리 완료 */}
          {imageStats.total > 0 && imageStats.remaining === 0 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg text-center">
              <p className="text-green-700 font-medium">
                모든 이미지 섹션이 처리되었습니다! 텍스트를 복사하여 블로그에 붙여넣기 하세요.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
