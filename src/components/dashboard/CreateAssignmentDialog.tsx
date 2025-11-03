'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const assignmentFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must not exceed 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  due_date: z
    .string()
    .min(1, 'Due date is required'),
});

type AssignmentFormData = z.infer<typeof assignmentFormSchema>;

interface CreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  onAssignmentCreated?: () => void;
}

export function CreateAssignmentDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  onAssignmentCreated,
}: CreateAssignmentDialogProps) {
  const t = useTranslations('assignments');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentFormSchema),
  });

  const onSubmit = async (data: AssignmentFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Convert datetime-local to ISO 8601 format
      const dueDate = new Date(data.due_date).toISOString();

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId,
          name: data.name,
          description: data.description || undefined,
          due_date: dueDate,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create assignment');
      }

      setSuccess(true);
      toast.success('Assignment created successfully!');
      
      // Wait a moment to show success message, then close and refresh
      setTimeout(() => {
        reset();
        onOpenChange(false);
        setSuccess(false);
        onAssignmentCreated?.();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset();
      setError(null);
      setSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title', { patientName })}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-4">
            {/* Assignment Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">
                {t('name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder={t('namePlaceholder')}
                {...register('name')}
                disabled={loading}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">{t('assignmentDescription')}</Label>
              <Textarea
                id="description"
                placeholder={t('descriptionPlaceholder')}
                rows={4}
                {...register('description')}
                disabled={loading}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="due_date">
                {t('dueDate')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="due_date"
                type="datetime-local"
                {...register('due_date')}
                disabled={loading}
              />
              {errors.due_date && (
                <p className="text-xs text-destructive">{errors.due_date.message}</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-900">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  {t('success')}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={loading || success}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  t('submit')
                )}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

