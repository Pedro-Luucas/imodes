'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthProfile } from '@/stores/authStore';
import { useIsMobile } from '@/hooks/useIsMobile';
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
  Undo2,
  Redo2,
  Plus,
  Minus,
  Trash2,
  Pencil,
  Palette,
  Maximize2,
  Eraser,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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
  _restoreCanvasState?: (state: import('@/types/canvas').CanvasState) => void;
  _resetCardPosition?: () => void;
  _fitToScreen?: () => void;
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
  const isMobile = useIsMobile();

  const [toolMode, setToolMode] = useState<'select' | 'hand' | 'text' | 'draw'>('select');
  const [strokeColor, setStrokeColor] = useState('#f59e0b');
  const [strokeWidth, setStrokeWidth] = useState(8);
  const [isEraserMode, setIsEraserMode] = useState(false);
  // Zoom offset: displayedZoom = actualZoom + 40
  // So 60% actual appears as 100%, 70% actual appears as 110%, etc.
  const ZOOM_DISPLAY_OFFSET = 40;

  const [zoomLevel, setZoomLevel] = useState(() => {
    // Default to 100% displayed (which is 60% actual)
    return 100;
  });
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(true);
  const [isControlsMenuOpen, setIsControlsMenuOpen] = useState(false);
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

  const handleCloseToolsPanel = useCallback(() => {
    setIsToolsPanelOpen(false);
    // Reset card position so next card starts at the default position
    const win = window as WindowWithCanvasCard;
    if (win._resetCardPosition) {
      win._resetCardPosition();
    }
  }, []);

  const handleClearCanvas = useCallback(() => {
    const win = window as WindowWithCanvasCard;
    if (win._clearCanvas) {
      win._clearCanvas();
    }
    setShowClearDialog(false);
  }, []);

  const handleRestoreCheckpoint = useCallback((state: import('@/types/canvas').CanvasState) => {
    const win = window as WindowWithCanvasCard;
    if (win._restoreCanvasState) {
      win._restoreCanvasState(state);
    }
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
    
    // Skip auto-create if:
    // - Already has sessionId in URL
    // - Is demo session (starts with "demo-")
    // - No profile (for demo sessions, profile is optional)
    // - Already creating or showing dialog
    if (sessionIdFromUrl || 
        sessionIdFromUrl?.startsWith('demo-') || 
        !profile || 
        creatingSessionRef.current || 
        showPatientDialog) return;

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
    if (!sessionId) return;

    // Handle demo sessions (no DB, use localStorage)
    if (sessionId.startsWith('demo-')) {
      const loadDemoSession = async () => {
        const { loadDemoSession, getInitialDemoState, isDemoSession } = await import('@/lib/demoSessionStorage');
        
        if (!isDemoSession(sessionId)) return;

        const demoState = loadDemoSession(sessionId) || getInitialDemoState();
        setSessionName(`Demo Session`);
        setSessionType('demonstration');
        setPatientProfile(null);
        setTherapistProfile(null);

        // Determine role from URL param or default to therapist
        // For demo, we map student/professor to therapist role for canvas functionality
        const roleParam = searchParams.get('role') as 'therapist' | 'patient' | 'student' | 'professor' | null;
        let demoRole: 'therapist' | 'patient' = 'therapist';
        if (roleParam === 'patient') {
          demoRole = 'patient';
        } else if (roleParam === 'student' || roleParam === 'professor' || roleParam === 'therapist') {
          demoRole = 'therapist'; // Map student/professor to therapist role for canvas
        }

        canvasStore.getState().hydrateFromServer({
          sessionId,
          role: demoRole,
          state: demoState,
          updatedAt: demoState.updatedAt,
        });
      };

      loadDemoSession();
      return;
    }

    // Regular sessions require profile
    if (!profile) return;

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
  }, [sessionId, profile, searchParams]);

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

  // Start timer when canvas opens (for therapists, skip for demo sessions)
  useEffect(() => {
    // Skip timer for demo sessions
    if (sessionId?.startsWith('demo-')) return;
    
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

  // Determine user role: for demo sessions, get from URL param; otherwise from profile
  const sessionIdFromUrl = searchParams.get('sessionId');
  const isDemoSession = sessionIdFromUrl?.startsWith('demo-');
  const demoRoleParam = searchParams.get('role') as 'therapist' | 'patient' | 'student' | 'professor' | null;
  
  const userRole = isDemoSession
    ? (demoRoleParam === 'patient' ? 'patient' : 'therapist') // Map student/professor to therapist
    : (profile?.role === 'patient' ? 'patient' : profile?.role === 'therapist' ? 'therapist' : undefined);

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

  // Prevent body scroll and pull-to-refresh on mobile
  useEffect(() => {
    if (isMobile) {
      // Prevent scroll on body
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalWidth = document.body.style.width;
      const originalHeight = document.body.style.height;
      const originalTop = document.body.style.top;
      
      // Save current scroll position
      const scrollY = window.scrollY;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = `-${scrollY}px`;
      
      // Prevent pull-to-refresh
      const preventDefault = (e: TouchEvent) => {
        // Allow touch events inside scrollable elements
        const target = e.target as HTMLElement;
        const isScrollable = target.closest('[data-scrollable]') || 
                            target.closest('.overflow-y-auto') ||
                            target.closest('.overflow-auto');
        
        if (!isScrollable) {
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchmove', preventDefault, { passive: false });
      document.addEventListener('touchstart', preventDefault, { passive: false });
      
      return () => {
        // Restore original styles
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        document.body.style.top = originalTop;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
        
        document.removeEventListener('touchmove', preventDefault);
        document.removeEventListener('touchstart', preventDefault);
      };
    }
  }, [isMobile]);

  if (isCreatingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Creating session...</div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col bg-gray-50",
      isMobile ? "fixed inset-0 w-screen h-screen overflow-hidden touch-none" : "h-screen w-full overflow-hidden"
    )}>
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
        isDemoSession={isDemoSession}
        onBackgroundClick={handleCloseToolsPanel}
      />

      {/* Canvas with Floating Controls */}
      <div className={cn(
        "flex-1 relative",
        isMobile ? "overflow-hidden touch-pan-y touch-pan-x" : "overflow-hidden"
      )}>
        {/* Canvas Background - Full Screen */}
        <CanvasBoard
          onAddCard={handleAddCard}
          scale={(zoomLevel - ZOOM_DISPLAY_OFFSET) / 100}
          gender={gender}
          locale={locale}
          toolMode={toolMode}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          isEraserMode={isEraserMode}
          sessionId={sessionId}
          userRole={userRole}
          onSave={handleManualSave}
          onZoomChange={(actualZoom) => setZoomLevel(actualZoom + ZOOM_DISPLAY_OFFSET)}
          onCanvasClick={handleCloseToolsPanel}
        />

        {/* Left Panel - Tools */}
        <ToolsPanel
          isOpen={isToolsPanelOpen}
          onClose={() => {
            setIsToolsPanelOpen(false);
            // Fechar menu de controles quando fechar o painel de ferramentas
            if (isMobile) {
              setIsControlsMenuOpen(false);
            }
          }}
          gender={gender}
          locale={locale}
          sessionId={sessionId}
          onCardSelect={handleAddCard}
          onRestoreCheckpoint={handleRestoreCheckpoint}
        />

        {!isToolsPanelOpen && (
          <div className={cn(
            "absolute z-20",
            isMobile ? "left-2 top-2" : "left-6 top-6"
          )}>
            <Button
              variant="secondary"
              className={cn(
                "h-auto gap-2",
                isMobile ? "px-3 py-1.5" : "px-4 py-2 gap-14"
              )}
              onClick={() => {
                setIsToolsPanelOpen(true);
                // Fechar menu de controles quando abrir o painel de ferramentas
                if (isMobile) {
                  setIsControlsMenuOpen(false);
                }
              }}
            >
              <span className={cn(
                "font-medium",
                isMobile ? "text-sm" : "text-base"
              )}>{tPage('tools')}</span>
              <svg
                width={isMobile ? "14" : "16"}
                height={isMobile ? "14" : "16"}
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
        {isMobile ? (
          /* Mobile: Menu expansível */
          <>
            {/* Overlay para fechar o menu ao clicar fora */}
            {isControlsMenuOpen && (
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsControlsMenuOpen(false)}
              />
            )}
            <div className="absolute right-2 bottom-2 z-20" style={{ marginBottom: '1rem' }}>
              {/* Botão principal do menu */}
              <Button
                variant="secondary"
                size="icon"
                className="size-10"
                onClick={() => setIsControlsMenuOpen(!isControlsMenuOpen)}
                title="Menu de controles"
              >
                <svg
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isControlsMenuOpen && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>

            {/* Menu expandido verticalmente para cima */}
            {isControlsMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 flex flex-col gap-2 bg-white rounded-2xl border border-gray-200 shadow-lg p-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* Clear Canvas Button - primeiro (mais próximo do botão) */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-9"
                  onClick={() => {
                    setShowClearDialog(true);
                    setIsControlsMenuOpen(false);
                  }}
                  title={tControls('clearCanvas') || 'Clear Canvas'}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-9"
                    onClick={() => setZoomLevel(Math.min(240, zoomLevel + 10))}
                    title={tControls('zoomIn')}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="default"
                    className="h-9 w-[70px] text-sm"
                    onClick={() => setZoomLevel(100)}
                  >
                    {Math.round(zoomLevel)}%
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-9"
                    onClick={() => setZoomLevel(Math.max(80, zoomLevel - 10))}
                    title={tControls('zoomOut')}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-9"
                    onClick={() => {
                      const win = window as WindowWithCanvasCard;
                      if (win._fitToScreen) {
                        win._fitToScreen();
                      }
                    }}
                    title={tControls('fitToScreen') || 'Fit to Screen'}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Undo/Redo */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-9"
                    title={tControls('undo')}
                    onClick={() => {
                      const win = window as WindowWithCanvasCard;
                      if (win._undoCanvas) {
                        win._undoCanvas();
                      }
                    }}
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-9"
                    title={tControls('redo')}
                    onClick={() => {
                      const win = window as WindowWithCanvasCard;
                      if (win._redoCanvas) {
                        win._redoCanvas();
                      }
                    }}
                  >
                    <Redo2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Tool Modes */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={toolMode === 'select' ? 'default' : 'secondary'}
                    size="icon"
                    className="size-9"
                    onClick={() => {
                      setToolMode('select');
                      setIsEraserMode(false);
                    }}
                    title={tControls('cursorTool')}
                  >
                    <MousePointer2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={toolMode === 'draw' ? 'default' : 'secondary'}
                    size="icon"
                    className="size-9"
                    onClick={() => {
                      if (toolMode === 'draw') {
                        setToolMode('select');
                        setIsEraserMode(false);
                      } else {
                        setToolMode('draw');
                        setIsEraserMode(false);
                      }
                    }}
                    title={tControls('drawTool') || 'Draw'}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>

                {/* Draw Tools - só aparece quando em modo draw */}
                {toolMode === 'draw' && (
                  <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-2 border border-gray-200">
                    {/* Color Swatches */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        '#18181b', // charcoal
                        '#ef4444', // red
                        '#22c55e', // green
                        '#3b82f6', // blue
                        '#f59e0b', // amber
                        '#a855f7', // purple
                      ].map((color) => (
                        <button
                          key={color}
                          onClick={() => { setStrokeColor(color); setIsEraserMode(false); }}
                          className={cn(
                            "size-5 rounded-full border-2 transition-all active:scale-95",
                            strokeColor === color ? "border-gray-400 scale-110 ring-2 ring-gray-100" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="size-5 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center transition-colors active:border-gray-400">
                            <Palette className="size-3 text-gray-500" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" side="left" align="center">
                          <div className="flex flex-col gap-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Color</span>
                            <input
                              type="color"
                              value={strokeColor}
                              onChange={(e) => setStrokeColor(e.target.value)}
                              className="w-full h-8 rounded cursor-pointer border-none bg-transparent"
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Thickness Selection */}
                    <div className="flex items-center gap-0.5">
                      {[4, 8, 12].map((width) => (
                        <button
                          key={width}
                          onClick={() => { setStrokeWidth(width); setIsEraserMode(false); }}
                          className={cn(
                            "h-7 px-1.5 rounded-md flex items-center justify-center transition-all active:bg-gray-100",
                            strokeWidth === width ? "bg-gray-100 text-blue-600" : "text-gray-400"
                          )}
                          title={`${width}px`}
                        >
                          <div
                            className="bg-current rounded-full"
                            style={{
                              width: '12px',
                              height: `${Math.min(width, 10)}px`,
                              opacity: strokeWidth === width ? 1 : 0.6
                            }}
                          />
                        </button>
                      ))}
                      <button
                        onClick={() => setIsEraserMode(true)}
                        className={cn(
                          "h-7 w-7 rounded-md flex items-center justify-center transition-all active:bg-gray-100",
                          isEraserMode ? "bg-gray-100 text-blue-600" : "text-gray-400"
                        )}
                        title={tControls('eraser')}
                      >
                        <Eraser className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </>
        ) : (
          /* Desktop: Controles horizontais normais */
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
                onClick={() => {
                  if (toolMode === 'draw' && isEraserMode) {
                    setIsEraserMode(false);
                  } else if (toolMode === 'draw') {
                    setToolMode('select');
                    setIsEraserMode(false);
                  } else {
                    setToolMode('draw');
                    setIsEraserMode(false);
                  }
                }}
                title={tControls('drawTool') || 'Draw'}
              >
                <Pencil className="w-5 h-5" />
              </Button>

              {toolMode === 'draw' && (
                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-2xl border border-gray-200 h-12 shadow-md animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* Color Swatches */}
                  <div className="flex items-center gap-1.5">
                    {[
                      '#18181b', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7',
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => { setStrokeColor(color); setIsEraserMode(false); }}
                        className={cn(
                          "size-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95",
                          strokeColor === color ? "border-gray-400 scale-110 ring-2 ring-gray-100" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="size-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                          <Palette className="size-3.5 text-gray-500" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" side="top" align="center">
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Color</span>
                          <input
                            type="color"
                            value={strokeColor}
                            onChange={(e) => setStrokeColor(e.target.value)}
                            className="w-full h-8 rounded cursor-pointer border-none bg-transparent"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-1">
                    {[4, 8, 12].map((width) => (
                      <button
                        key={width}
                        onClick={() => { setStrokeWidth(width); setIsEraserMode(false); }}
                        className={cn(
                          "h-8 px-2 rounded-md flex items-center justify-center transition-all hover:bg-gray-100",
                          strokeWidth === width ? "bg-gray-100 text-blue-600" : "text-gray-400"
                        )}
                        title={`${width}px`}
                      >
                        <div
                          className="bg-current rounded-full"
                          style={{
                            width: '16px',
                            height: `${Math.min(width, 14)}px`,
                            opacity: strokeWidth === width ? 1 : 0.6
                          }}
                        />
                      </button>
                    ))}
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <button
                    onClick={() => setIsEraserMode(true)}
                    className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center transition-all hover:bg-gray-100",
                      isEraserMode ? "bg-gray-100 text-blue-600" : "text-gray-400"
                    )}
                    title={tControls('eraser')}
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
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
              <Button
                variant="secondary"
                size="icon"
                className="size-10"
                onClick={() => {
                  const win = window as WindowWithCanvasCard;
                  if (win._fitToScreen) {
                    win._fitToScreen();
                  }
                }}
                title={tControls('fitToScreen') || 'Fit to Screen'}
              >
                <Maximize2 className="w-5 h-5" />
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
        )}
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

      {/* Patient Selection Dialog - Only show for non-demo sessions */}
      {!isDemoSession && profile?.role === 'therapist' && profile?.id && (
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

