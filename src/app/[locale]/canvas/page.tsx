'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthProfile } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { CanvasBoard } from '@/components/canvas/CanvasBoard';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { ToolsPanel } from '@/components/canvas/ToolsPanel';
import { SelectPatientDialog } from '@/components/canvas/SelectPatientDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Gender, CardCategory } from '@/types/canvas';
import {
  MousePointer2,
  Type,
  Undo2,
  Redo2,
  Plus,
  Minus,
  Trash2,
  Pencil,
} from 'lucide-react';
import type { Profile } from '@/types/auth';
import { canvasStore, type CanvasSaveReason } from '@/stores/canvasStore';
import { startCanvasAutosave, flushCanvasChanges } from '@/lib/canvasPersistence';

interface WindowWithCanvasCard extends Window {
  _addCanvasCard?: (card?: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => void;
  _clearCanvas?: () => void;
  _undoCanvas?: () => void;
  _redoCanvas?: () => void;
}

export default function CanvasPage() {
  usePageMetadata('Canvas', 'Interactive canvas for therapy sessions.');
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const profile = useAuthProfile();
  const locale = (params.locale as string) || 'en';
  const tControls = useTranslations('canvas.controls');
  const tPage = useTranslations('canvas.page');

  const [toolMode, setToolMode] = useState<'select' | 'hand' | 'text' | 'draw'>('select');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  // Zoom offset: displayedZoom = actualZoom + 40
  // So 60% actual appears as 100%, 70% actual appears as 110%, etc.
  const ZOOM_DISPLAY_OFFSET = 40;

  const [zoomLevel, setZoomLevel] = useState(() => {
    // Default to 100% displayed (which is 60% actual)
    return 100;
  });
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(true);
  const [gender, setGender] = useState<Gender>('male');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const creatingSessionRef = useRef(false);
  const [patientProfile, setPatientProfile] = useState<Profile | null>(null);
  const [therapistProfile, setTherapistProfile] = useState<Profile | null>(null);
  //  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [sessionType, setSessionType] = useState<string>('Individual');
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [currentDuration, setCurrentDuration] = useState<number>(0); // Current session duration in seconds
  const sessionStartTimeRef = useRef<Date | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const storeSessionRef = useRef<string | null>(null);

  const handleAddCard = useCallback((card?: {
    imageUrl?: string;
    title: string;
    description: string;
    category: CardCategory;
    cardNumber: number;
  }) => {
    // Trigger card addition via global method
    const win = window as WindowWithCanvasCard;
    if (win._addCanvasCard) {
      win._addCanvasCard(card);
    }
  }, []);

  const handleClearCanvas = useCallback(() => {
    const win = window as WindowWithCanvasCard;
    if (win._clearCanvas) {
      win._clearCanvas();
    }
    setShowClearDialog(false);
  }, []);

  // Get sessionId from URL query params
  useEffect(() => {
    const sessionIdParam = searchParams.get('sessionId');
    setSessionId(sessionIdParam);
  }, [searchParams]);

  // Auto-create session if missing
  useEffect(() => {
    // Check searchParams directly to avoid race condition with state update
    const sessionIdFromUrl = searchParams.get('sessionId');
    if (sessionIdFromUrl || !profile || creatingSessionRef.current || showPatientDialog) return;

    const createSession = async (patientId: string | null = null, type: string = 'session') => {
      creatingSessionRef.current = true;
      setIsCreatingSession(true);
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patient_id: patientId,
            type: type,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create session');
        }

        const data = await response.json();
        const newSessionId = data.session.id;
        router.replace(`/canvas?sessionId=${newSessionId}`);
        setSessionId(newSessionId);
        setSessionName(data.session.name);
        if (data.session.type) {
          setSessionType(data.session.type);
        }
      } catch (error) {
        console.error('Error creating session:', error);
        // Don't redirect, let user see error or go back
      } finally {
        setIsCreatingSession(false);
        creatingSessionRef.current = false;
      }
    };

    // Check if therapist has patients
    if (profile.role === 'therapist') {
      const checkAndCreate = async () => {
        try {
          const patientsResponse = await fetch(`/api/therapists/${profile.id}/patients`);
          if (patientsResponse.ok) {
            const patientsData = await patientsResponse.json();
            const patients = patientsData.patients || [];

            if (patients.length === 0) {
              // No patients, create playground session directly
              await createSession(null, 'playground');
            } else {
              // Has patients, show dialog
              setShowPatientDialog(true);
            }
          } else {
            // Error fetching patients, create playground session
            await createSession(null, 'playground');
          }
        } catch (error) {
          console.error('Error checking patients:', error);
          // On error, create playground session
          await createSession(null, 'playground');
        }
      };
      checkAndCreate();
    } else {
      // Patient or other role, create session normally
      createSession();
    }
  }, [searchParams, profile, router, showPatientDialog]);

  // Load session data when sessionId changes
  useEffect(() => {
    if (!sessionId || !profile) return;

    const loadSessionData = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          const session = data.session;
          setSessionName(session?.name || null);

          // Load notes from session data
          /*if (session?.data?.therapistSettings?.notes) {
            setSessionNotes(session.data.therapistSettings.notes);
          }*/

          // Set session type from session data
          if (session.type) {
            setSessionType(session.type);
          }

          // Fetch patient and therapist profiles
          if (session.patient_id) {
            try {
              const patientResponse = await fetch(`/api/patients/${session.patient_id}`);
              if (patientResponse.ok) {
                const patientData = await patientResponse.json();
                setPatientProfile(patientData.profile);
              }
            } catch (error) {
              console.error('Error loading patient profile:', error);
            }
          } else {
            // No patient_id, clear patient profile
            setPatientProfile(null);
          }

          if (session.therapist_id) {
            try {
              const therapistResponse = await fetch(`/api/therapists/${session.therapist_id}`);
              if (therapistResponse.ok) {
                const therapistData = await therapistResponse.json();
                setTherapistProfile(therapistData.profile);
              }
            } catch (error) {
              console.error('Error loading therapist profile:', error);
            }
          }

          const roleForHydration =
            profile.role === 'patient'
              ? 'patient'
              : profile.role === 'therapist'
                ? 'therapist'
                : null;

          if (roleForHydration) {
            canvasStore.getState().hydrateFromServer({
              sessionId,
              role: roleForHydration,
              state: session?.data ?? null,
              updatedAt: session?.updated_at,
            });
          }
        }
      } catch (error) {
        console.error('Error loading session data:', error);
      }
    };

    loadSessionData();
  }, [sessionId, profile]);

  useEffect(() => {
    if (!sessionId) return;

    const stopAutosave = startCanvasAutosave({
      sessionId,
      enabled: true,
      onError: (error) => {
        console.error('Autosave error:', error);
      },
    });

    return () => {
      stopAutosave();
    };
  }, [sessionId]);

  // Save timer data to session
  const saveTimerData = useCallback(async (sessionId: string, startTime: Date, duration: number) => {
    try {
      // Fetch current session data
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }

      const data = await response.json();
      const session = data.session;

      // Get existing timeSpent array or create new one
      const existingTimeSpent = session?.data?.timeSpent || [];

      // Add new entry
      const newEntry = {
        timestamp: startTime.toISOString(),
        timeSpent: duration,
      };

      const updatedTimeSpent = [...existingTimeSpent, newEntry];

      // Update only the timeSpent field specifically to avoid overwriting state
      const updatedData = {
        ...(session?.data || {}),
        timeSpent: updatedTimeSpent,
        // Ensure we don't accidentally drop drawPaths if they exist in the current session data
        drawPaths: session?.data?.drawPaths || [],
      };

      // Save to session
      const saveResponse = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: updatedData }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save timer data');
      }
    } catch (error) {
      console.error('Error saving timer data:', error);
    }
  }, []);

  // Start timer when canvas opens (for therapists)
  useEffect(() => {
    const isTherapist = profile?.role === 'therapist';
    if (!isTherapist || !sessionId) return;

    // Start timer when component mounts
    if (!sessionStartTimeRef.current) {
      sessionStartTimeRef.current = new Date();
    }

    // Update timer every second
    timerIntervalRef.current = setInterval(() => {
      if (sessionStartTimeRef.current) {
        const elapsed = Math.floor((new Date().getTime() - sessionStartTimeRef.current.getTime()) / 1000);
        setCurrentDuration(elapsed);
      }
    }, 1000);

    // Handle page unload - save timer data
    const handleBeforeUnload = () => {
      if (sessionStartTimeRef.current && sessionId) {
        const finalDuration = Math.floor((new Date().getTime() - sessionStartTimeRef.current.getTime()) / 1000);
        if (finalDuration > 0) {
          // Fetch current session and save timer data
          // Use keepalive to ensure request completes even after page unload
          fetch(`/api/sessions/${sessionId}`)
            .then(response => response.json())
            .then(data => {
              const session = data.session;
              const existingTimeSpent = session?.data?.timeSpent || [];
              const newEntry = {
                timestamp: sessionStartTimeRef.current!.toISOString(),
                timeSpent: finalDuration,
              };
              const updatedTimeSpent = [...existingTimeSpent, newEntry];
              const updatedData = {
                ...(session?.data || {}),
                timeSpent: updatedTimeSpent,
                drawPaths: session?.data?.drawPaths || [],
              };
              // Use fetch with keepalive for reliable save on page unload
              fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data: updatedData }),
                keepalive: true,
              }).catch(() => {
                // Ignore errors on unload
              });
            })
            .catch(() => {
              // Ignore errors on unload
            });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup: Save timer data when leaving canvas
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Save timer data when component unmounts
      if (sessionStartTimeRef.current && sessionId) {
        const finalDuration = Math.floor((new Date().getTime() - sessionStartTimeRef.current.getTime()) / 1000);
        if (finalDuration > 0) {
          saveTimerData(sessionId, sessionStartTimeRef.current, finalDuration);
        }
      }
    };
  }, [sessionId, profile, saveTimerData]);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    if (!sessionId) {
      throw new Error('No session to save');
    }

    try {
      await flushCanvasChanges(sessionId, {
        force: true,
        extraReasons: ['manual' as CanvasSaveReason],
      });
    } catch (error) {
      console.error('Manual save error:', error);
      throw error;
    }
  }, [sessionId]);

  const userRole = profile?.role === 'patient' ? 'patient' : profile?.role === 'therapist' ? 'therapist' : undefined;

  useEffect(() => {
    const storeApi = canvasStore.getState();
    if (sessionId !== storeSessionRef.current) {
      storeApi.reset();
      storeSessionRef.current = sessionId;
    }
    storeApi.setSessionMetadata({
      sessionId,
      role: userRole ?? null,
    });
  }, [sessionId, userRole]);

  if (isCreatingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Creating session...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-50">
      {/* Header */}
      <CanvasHeader
        gender={gender}
        onGenderChange={setGender}
        sessionTitle={sessionName || undefined}
        onSave={sessionId ? handleManualSave : undefined}
        sessionId={sessionId}
        patientProfile={patientProfile}
        therapistProfile={therapistProfile}
        sessionType={sessionType}
        language="English"
        //initialNotes={sessionNotes}
        /*onNotesChange={(notes) => {
          setSessionNotes(notes);
          // Notes will be auto-saved by SessionDetailsPanel
        }}*/
        currentDuration={currentDuration}
        onSessionRenamed={setSessionName}
        onBackgroundClick={() => setIsToolsPanelOpen(false)}
      />

      {/* Canvas with Floating Controls */}
      <div className="flex-1 relative overflow-hidden">
        {/* Canvas Background - Full Screen */}
        <CanvasBoard
          onAddCard={handleAddCard}
          scale={(zoomLevel - ZOOM_DISPLAY_OFFSET) / 100}
          gender={gender}
          locale={locale}
          toolMode={toolMode}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          sessionId={sessionId}
          userRole={userRole}
          onSave={handleManualSave}
          onZoomChange={(actualZoom) => setZoomLevel(actualZoom + ZOOM_DISPLAY_OFFSET)}
          onCanvasClick={() => setIsToolsPanelOpen(false)}
        />

        {/* Left Panel - Tools */}
        <ToolsPanel
          isOpen={isToolsPanelOpen}
          onClose={() => setIsToolsPanelOpen(false)}
          gender={gender}
          locale={locale}
          onCardSelect={handleAddCard}
        />

        {!isToolsPanelOpen && (
          <div className="absolute left-6 top-6 z-10">
            <Button
              variant="secondary"
              className="h-auto px-4 py-2 gap-14"
              onClick={() => setIsToolsPanelOpen(true)}
            >
              <span className="text-base font-medium">{tPage('tools')}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-foreground"
              >
                <path
                  d="M6 5L9.5 8.5L6 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
        )}

        {/* Right Panel - Vertical Tool Icons */}
        <div className="absolute right-6 top-6 z-10">
          <div className="flex flex-col gap-4">
            <Button
              variant={toolMode === 'select' ? 'default' : 'secondary'}
              size="icon"
              className="size-10 hidden"
              onClick={() => setToolMode('select')}
              title={tControls('cursorTool')}
            >
              <MousePointer2 className="w-5 h-5" />
            </Button>

            {/*<Button
              variant={toolMode === 'text' ? 'default' : 'secondary'}
              size="icon"
              className="size-10"
              onClick={() => setToolMode('text')}
              title={tControls('textTool')}
            >
              <Type className="w-5 h-5" />
            </Button>*/}
          </div>
        </div>

        {/* Bottom Right - Controls */}
        <div className="absolute right-6 bottom-6 z-10 flex items-center gap-6">
          {/* Tool Modes */}
          <div className="flex items-center gap-2">
            <Button
              variant={toolMode === 'select' ? 'default' : 'secondary'}
              size="icon"
              className="size-10"
              onClick={() => setToolMode('select')}
              title={tControls('cursorTool')}
            >
              <MousePointer2 className="w-5 h-5" />
            </Button>
            <Button
              variant={toolMode === 'draw' ? 'default' : 'secondary'}
              size="icon"
              className="size-10"
              onClick={() => setToolMode(toolMode === 'draw' ? 'select' : 'draw')}
              title={tControls('drawTool') || 'Draw'}
            >
              <Pencil className="w-5 h-5" />
            </Button>

            {toolMode === 'draw' && (
              <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-gray-200 h-10 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-gray-200 p-0 overflow-hidden"
                  title={tControls('color') || 'Color'}
                />
                <select
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="h-7 text-[10px] md:text-xs border-gray-200 rounded bg-transparent focus:ring-0"
                  title={tControls('thickness') || 'Thickness'}
                >
                  <option value={2}>2px</option>
                  <option value={4}>4px</option>
                  <option value={8}>8px</option>
                  <option value={12}>16px</option>
                </select>
              </div>
            )}
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="size-10"
              title={tControls('undo')}
              onClick={() => {
                const win = window as WindowWithCanvasCard;
                if (win._undoCanvas) {
                  win._undoCanvas();
                }
              }}
            >
              <Undo2 className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="size-10"
              title={tControls('redo')}
              onClick={() => {
                const win = window as WindowWithCanvasCard;
                if (win._redoCanvas) {
                  win._redoCanvas();
                }
              }}
            >
              <Redo2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Zoom Controls */}
          {/* Min displayed: 80% (40% actual), Max displayed: 240% (200% actual) */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="size-10"
              onClick={() => setZoomLevel(Math.min(240, zoomLevel + 10))}
              title={tControls('zoomIn')}
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="default"
              className="h-10 w-[85px]"
              onClick={() => setZoomLevel(100)}
            >
              {Math.round(zoomLevel)}%
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="size-10"
              onClick={() => setZoomLevel(Math.max(80, zoomLevel - 10))}
              title={tControls('zoomOut')}
            >
              <Minus className="w-5 h-5" />
            </Button>
          </div>

          {/* Clear Canvas Button */}
          <Button
            variant="secondary"
            size="icon"
            className="size-10"
            onClick={() => setShowClearDialog(true)}
            title={tControls('clearCanvas') || 'Clear Canvas'}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Clear Canvas Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tControls('clearCanvasTitle') || 'Clear Canvas'}</AlertDialogTitle>
            <AlertDialogDescription>
              {tControls('clearCanvasMessage') || 'Are you sure you want to clear the entire canvas? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tControls('cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCanvas}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tControls('clear') || 'Clear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Patient Selection Dialog */}
      {profile?.role === 'therapist' && profile?.id && (
        <SelectPatientDialog
          open={showPatientDialog}
          onOpenChange={setShowPatientDialog}
          therapistId={profile.id}
          onSelect={async (patientId: string | null, type: string) => {
            try {
              setIsCreatingSession(true);
              const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  patient_id: patientId,
                  type: type,
                }),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create session');
              }

              const data = await response.json();
              const newSessionId = data.session.id;
              router.replace(`/canvas?sessionId=${newSessionId}`);
              setSessionId(newSessionId);
              setSessionName(data.session.name);
              if (data.session.type) {
                setSessionType(data.session.type);
              }
            } catch (error) {
              console.error('Error creating session:', error);
            } finally {
              setIsCreatingSession(false);
            }
          }}
        />
      )}
    </div>
  );
}

