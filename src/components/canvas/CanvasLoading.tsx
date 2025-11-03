'use client';

import { useTranslations } from 'next-intl';

export function CanvasLoading() {
  const t = useTranslations('canvas.loading');
  
  return (
    <div className="absolute inset-0 w-full h-full bg-[#f7f7f7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-gray-600 font-medium">{t('loadingCards')}</p>
      </div>
    </div>
  );
}

