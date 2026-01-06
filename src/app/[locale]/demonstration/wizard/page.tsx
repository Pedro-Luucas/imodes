'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type WizardStep = 1 | 2 | 3 | 4;

interface DemoFormData {
  fullName: string;
  email: string;
  role: 'therapist' | 'patient' | 'student' | 'professor' | null;
}

export default function DemonstrationWizardPage() {
  const t = useTranslations('demonstration.wizard');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<DemoFormData>({
    fullName: '',
    email: '',
    role: null,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DemoFormData, string>>>({});

  const validateStep = (step: WizardStep): boolean => {
    const newErrors: Partial<Record<keyof DemoFormData, string>> = {};

    if (step === 1) {
      if (!formData.fullName.trim()) {
        newErrors.fullName = t('errors.fullNameRequired') || 'Nome é obrigatório';
      } else if (formData.fullName.trim().length < 2) {
        newErrors.fullName = t('errors.fullNameMinLength') || 'Nome deve ter pelo menos 2 caracteres';
      }
    }

    if (step === 2) {
      if (!formData.email.trim()) {
        newErrors.email = t('errors.emailRequired') || 'Email é obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = t('errors.emailInvalid') || 'Email inválido';
      }
    }

    if (step === 3) {
      if (!formData.role) {
        newErrors.role = t('errors.roleRequired') || 'Selecione um papel';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      return;
    }

    setIsCreating(true);

    try {
      // Create demo profile and session
      const response = await fetch('/api/demonstration/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          first_name: formData.fullName.split(' ')[0] || formData.fullName,
          email: formData.email,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('errors.createFailed') || 'Falha ao criar demonstração');
      }

      const data = await response.json();
      
      // Redirect to canvas with demo session (sessionId starts with "demo-")
      // Include role in URL so canvas knows which role to use
      router.push(`/canvas?sessionId=${data.sessionId}&demo=true&role=${formData.role}`);
    } catch (error) {
      console.error('Error creating demo:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : t('errors.createFailed') || 'Falha ao criar demonstração'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return t('step1.title') || 'Qual é o seu nome?';
      case 2:
        return t('step2.title') || 'Qual é o seu email?';
      case 3:
        return t('step3.title') || 'Você é terapeuta ou paciente?';
      case 4:
        return t('step4.title') || 'Pronto para começar!';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return t('step1.description') || 'Digite seu nome completo';
      case 2:
        return t('step2.description') || 'Usaremos apenas para identificar sua sessão';
      case 3:
        return t('step3.description') || 'Selecione o papel que melhor descreve você';
      case 4:
        return t('step4.description') || 'Clique no botão abaixo para começar a usar o canvas';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-2 mx-1 rounded-full ${
                    step <= currentStep
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              {t('step') || 'Passo'} {currentStep} {t('of') || 'de'} 4
            </p>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getStepTitle()}
            </h2>
            <p className="text-gray-600 mb-6">
              {getStepDescription()}
            </p>

            {/* Step 1: Name */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName">
                    {t('step1.label') || 'Nome Completo'}
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, fullName: e.target.value }));
                      if (errors.fullName) {
                        setErrors((prev) => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    placeholder={t('step1.placeholder') || 'Digite seu nome completo'}
                    className="mt-2"
                    autoFocus
                  />
                  {errors.fullName && (
                    <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Email */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">
                    {t('step2.label') || 'Email'}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }));
                      if (errors.email) {
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder={t('step2.placeholder') || 'seu@email.com'}
                    className="mt-2"
                    autoFocus
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Role */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role">
                    {t('step3.label') || 'Eu sou'}
                  </Label>
                  <Select
                    value={formData.role || ''}
                    onValueChange={(value: string) => {
                      setFormData((prev) => ({ ...prev, role: value as 'therapist' | 'patient' | 'student' | 'professor' }));
                      if (errors.role) {
                        setErrors((prev) => ({ ...prev, role: undefined }));
                      }
                    }}
                  >
                    <SelectTrigger id="role" className="mt-2">
                      <SelectValue placeholder={t('step3.placeholder') || 'Selecione...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="therapist">
                        {t('step3.therapist') || 'Terapeuta'}
                      </SelectItem>
                      <SelectItem value="patient">
                        {t('step3.patient') || 'Paciente'}
                      </SelectItem>
                      <SelectItem value="student">
                        {t('step3.student') || 'Estudante'}
                      </SelectItem>
                      <SelectItem value="professor">
                        {t('step3.professor') || 'Professor'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-red-500 mt-1">{errors.role}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Ready */}
            {currentStep === 4 && (
              <div className="text-center py-8">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">
                  {t('step4.ready') || 'Tudo pronto! Clique no botão abaixo para começar.'}
                </p>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
                disabled={isCreating}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back') || 'Voltar'}
              </Button>
            )}
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                className="flex-1"
                disabled={isCreating}
              >
                {t('next') || 'Próximo'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('creating') || 'Criando...'}
                  </>
                ) : (
                  <>
                    {t('goToCanvas') || 'Ir para Canvas'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
