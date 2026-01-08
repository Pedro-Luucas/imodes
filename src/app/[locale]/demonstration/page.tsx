'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
// QR Code will be generated via API or we can use a simple solution
import { ArrowRight, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function DemonstrationPage() {
  const t = useTranslations('demonstration');
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [demoUrl, setDemoUrl] = useState('');

  // Get current URL for QR code and sharing (only on client)
  useEffect(() => {
    setDemoUrl(`${window.location.origin}/demonstration/wizard`);
  }, []);

  const handleCopyLink = async () => {
    if (!demoUrl) return;
    
    try {
      await navigator.clipboard.writeText(demoUrl);
      setCopied(true);
      toast.success(t('linkCopied') || 'Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error(t('copyFailed') || 'Falha ao copiar link');
    }
  };

  const handleStartDemo = () => {
    router.push('/demonstration/wizard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative h-11 w-[186px] sm:h-[62px] sm:w-[266px] mb-4">
              <Image src="/imodes.png" alt="iModes" fill className="object-contain mix-blend-darken" priority />
            </div>
            <p className="text-lg text-gray-600">
              {t('subtitle') || 'Experimente o canvas interativo do iModes'}
            </p>
          </div>

          {/* QR Code */}
          <div className="mb-8 flex justify-center">
            <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
              {demoUrl && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(demoUrl)}`}
                  alt="QR Code"
                  className="w-[200px] h-[200px]"
                />
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            {t('scanInstructions') || 'Escaneie o QR code ou use o link abaixo'}
          </p>

          {/* Share Link */}
          <div className="mb-8">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <input
                type="text"
                value={demoUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            onClick={handleStartDemo}
            className="w-full md:w-auto min-w-[200px]"
          >
            {t('startButton') || 'Começar Demonstração'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          {/* Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {t('info') || 'Esta é uma demonstração interativa. Seus dados serão usados apenas para esta sessão.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
