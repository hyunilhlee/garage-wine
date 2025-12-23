'use client';

import { useState, useRef } from 'react';

interface ImageResult {
  id: string;
  thumb: string;
  regular: string;
  alt: string;
  credit: string;
}

interface ImageSelectorProps {
  placeholder: string;
  onSelect: (imageUrl: string) => void;
  onSkip?: () => void;
  selectedImage?: string;
  isSkipped?: boolean;
}

export default function ImageSelector({ placeholder, onSelect, onSkip, selectedImage, isSkipped }: ImageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(placeholder);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isEditingQuery, setIsEditingQuery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchImages = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/images/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setImages(data.results || []);
    } catch {
      console.error('이미지 검색 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onSelect(dataUrl);
        setIsOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Google 이미지 검색 새 탭 열기
  const openGoogleImageSearch = () => {
    const query = encodeURIComponent(searchQuery || placeholder);
    window.open(`https://www.google.com/search?tbm=isch&q=${query}`, '_blank');
  };

  const handleSelect = (imageUrl: string) => {
    onSelect(imageUrl);
    setIsOpen(false);
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      setUrlError('URL을 입력해주세요');
      return;
    }

    // 간단한 URL 검증
    try {
      new URL(urlInput);
      onSelect(urlInput.trim());
      setUrlInput('');
      setUrlError('');
      setIsOpen(false);
    } catch {
      setUrlError('올바른 URL 형식이 아닙니다');
    }
  };

  // 스킵된 상태
  if (isSkipped) {
    return (
      <div className="my-3 flex items-center gap-2 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500">
        <span className="text-xl">⏭️</span>
        <span className="line-through">{placeholder}</span>
        <button
          onClick={() => onSkip?.()}
          className="ml-auto text-sm text-purple-600 hover:text-purple-800"
        >
          되돌리기
        </button>
      </div>
    );
  }

  // 이미지가 선택된 상태
  if (selectedImage) {
    return (
      <div className="relative my-3 group">
        <img
          src={selectedImage}
          alt={placeholder}
          className="w-full max-w-md rounded-lg shadow-md"
        />
        <button
          onClick={() => onSelect('')}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="my-3">
      <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-100 transition-colors w-full">
        <span className="text-2xl">🖼️</span>
        {isEditingQuery ? (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={() => setIsEditingQuery(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingQuery(false);
                setIsOpen(true);
                searchImages();
              }
              if (e.key === 'Escape') {
                setIsEditingQuery(false);
              }
            }}
            autoFocus
            className="flex-1 px-2 py-1 border rounded focus:ring-2 focus:ring-purple-500 bg-white"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-center gap-1 flex-1">
            <span
              className="text-purple-700 cursor-pointer hover:underline"
              onClick={() => setIsEditingQuery(true)}
              title="클릭하여 검색어 수정"
            >
              {searchQuery}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingQuery(true);
              }}
              className="text-gray-400 hover:text-purple-600 p-1"
              title="검색어 수정"
            >
              ✏️
            </button>
          </div>
        )}
        <button
          onClick={() => {
            if (isEditingQuery) {
              setIsEditingQuery(false);
            }
            setIsOpen(!isOpen);
            if (!isOpen && images.length === 0) {
              searchImages();
            }
          }}
          className="ml-auto text-sm text-purple-500 hover:text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
        >
          {isOpen ? '닫기' : '이미지 선택'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-2 p-4 bg-white border rounded-lg shadow-lg">
          {/* 검색 바 */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchImages()}
              placeholder="이미지 검색..."
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={searchImages}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              {isLoading ? '...' : '검색'}
            </button>
          </div>

          {/* Google 이미지 검색 */}
          <div className="mb-4">
            <button
              onClick={openGoogleImageSearch}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">🔍</span>
              <span className="text-blue-700 font-medium">Google 이미지 검색 (새 탭)</span>
            </button>
            <p className="mt-1 text-xs text-gray-500 text-center">
              검색 후 이미지 URL을 복사해서 아래에 붙여넣기
            </p>
          </div>

          {/* URL 직접 입력 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔗 이미지 URL 붙여넣기
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <button
                onClick={handleUrlSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                적용
              </button>
            </div>
            {urlError && (
              <p className="mt-1 text-sm text-red-500">{urlError}</p>
            )}
          </div>

          {/* 이미지 업로드 */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              📁 내 컴퓨터에서 이미지 업로드
            </button>
          </div>

          {/* 이미지 그리드 */}
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => handleSelect(img.regular)}
                className="relative aspect-video rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
              >
                <img
                  src={img.thumb}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {images.length === 0 && !isLoading && (
            <p className="text-center text-gray-500 py-4">
              검색 결과가 없습니다. 다른 키워드로 검색해보세요.
            </p>
          )}

          {/* 스킵 버튼 */}
          {onSkip && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => {
                  onSkip();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ⏭️ 이 이미지 섹션 스킵하기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
