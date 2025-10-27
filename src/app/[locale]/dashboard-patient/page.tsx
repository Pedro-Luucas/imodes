'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthProfile } from '@/stores/authStore';
import { useTherapistActions } from '@/stores/therapistStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  PencilLine, 
  Clock, 
  Smile, 
  Wrench, 
  Timer,
  Loader2 
} from 'lucide-react';

// Mock data types
interface Session {
  id: string;
  title: string;
  therapist: string;
  date: string;
  schedule?: string;
  duration?: string;
  status: 'upcoming' | 'completed';
  icon: 'smile' | 'wrench';
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'in-progress' | 'overdue' | 'completed';
}

export default function DashboardPatientPage() {
  const router = useRouter();
  const profile = useAuthProfile();
  const { getPatientTherapist } = useTherapistActions();
  const [loading, setLoading] = useState(true);

  // Mock data - replace with real API calls later
  const [sessions] = useState<Session[]>([
    {
      id: '1',
      title: 'Progress Review Session',
      therapist: 'Dr. Sarah Johnson',
      date: 'Dec 22, 2025',
      schedule: '2:00 PM - 2:50 PM',
      status: 'upcoming',
      icon: 'smile',
    },
    {
      id: '2',
      title: 'Cognitive Behavioral Therapy',
      therapist: 'Dr. Sarah Johnson',
      date: 'Dec 22, 2025',
      duration: '50m',
      status: 'completed',
      icon: 'wrench',
    },
    {
      id: '3',
      title: 'Cognitive Behavioral Therapy',
      therapist: 'Dr. Sarah Johnson',
      date: 'Dec 22, 2025',
      duration: '50m',
      status: 'completed',
      icon: 'wrench',
    },
  ]);

  const [assignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Assignment #3',
      description: 'Track your daily emotions and triggers',
      dueDate: 'Dec 22, 2025',
      status: 'in-progress',
    },
    {
      id: '2',
      title: 'Assignment #3',
      description: 'Track your daily emotions and triggers',
      dueDate: 'Dec 22, 2025',
      status: 'in-progress',
    },
    {
      id: '3',
      title: 'Assignment #3',
      description: 'Track your daily emotions and triggers',
      dueDate: 'Dec 22, 2025',
      status: 'overdue',
    },
    {
      id: '4',
      title: 'Assignment #3',
      description: 'Track your daily emotions and triggers',
      dueDate: 'Dec 22, 2025',
      status: 'completed',
    },
  ]);

  useEffect(() => {
    const checkTherapist = async () => {
      if (profile?.id) {
        setLoading(true);
        const therapistData = await getPatientTherapist(profile.id);
        setLoading(false);
        
        // Redirect to no-therapist page if no therapist assigned
        if (!therapistData) {
          router.push('/dashboard-patient/no-therapist');
        }
      }
    };

    checkTherapist();
  }, [profile, getPatientTherapist, router]);

  const getSessionIcon = (icon: string) => {
    switch (icon) {
      case 'smile':
        return Smile;
      case 'wrench':
        return Wrench;
      default:
        return Smile;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-sky-50 text-sky-600 border-transparent';
      case 'in-progress':
        return 'bg-green-50 text-green-600 border-transparent';
      case 'completed':
        return 'bg-neutral-200 text-muted-foreground border-transparent';
      case 'overdue':
        return 'bg-red-50 text-red-500 border-transparent';
      default:
        return 'bg-neutral-200 text-muted-foreground border-transparent';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'Upcoming';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'overdue':
        return 'Overdue';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || profile.role !== 'patient') {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 py-8 px-6 md:px-12 lg:px-24">
      {/* Welcome Banner */}
      <Card className="border border-input rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-medium text-foreground">
              Welcome back, {profile.first_name}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Heres your therapy progress overview
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-4xl font-bold text-orange-400">12</span>
            <p className="text-sm text-muted-foreground">
              Heres your therapy progress overview
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next Session */}
        <Card className="border border-input rounded-2xl p-4">
          <div className="flex gap-4 items-center">
            <div className="bg-stone-100 rounded-lg p-4">
              <Calendar className="w-6 h-6 text-stone-600" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-foreground">Next Session</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Dec 22, 2025</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Active Assignment */}
        <Card className="border border-input rounded-2xl p-4">
          <div className="flex gap-4 items-center">
            <div className="bg-stone-100 rounded-lg p-4">
              <PencilLine className="w-6 h-6 text-stone-600" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-foreground">Active Assignment</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>3 pending</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Days Since Last Session */}
        <Card className="border border-input rounded-2xl p-4">
          <div className="flex gap-4 items-center">
            <div className="bg-stone-100 rounded-lg p-4">
              <Clock className="w-6 h-6 text-stone-600" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-foreground">Days Since Last Session</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>3 days</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Two Column Layout - Sessions & Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <Card className="border border-input rounded-2xl p-4">
          <div className="flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Sessions</h2>
              <button className="text-sm text-sky-600 hover:underline">View all</button>
            </div>

            {/* Sessions List */}
            <div className="flex flex-col gap-2 flex-1">
              {sessions.map((session) => {
                const Icon = getSessionIcon(session.icon);
                const bgColor = session.icon === 'smile' ? 'bg-sky-50' : 'bg-yellow-50';
                const iconColor = session.icon === 'smile' ? 'text-sky-600' : 'text-yellow-600';

                return (
                  <Card key={session.id} className="border border-input rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`${bgColor} rounded-lg p-6 flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${iconColor}`} />
                        </div>
                        <div className="flex flex-col gap-2">
                          <h3 className="text-base font-medium text-foreground">
                            {session.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">{session.therapist}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {session.schedule 
                                ? `Schedule: ${session.schedule}` 
                                : session.date}
                            </span>
                          </div>
                          {session.duration && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Timer className="w-4 h-4" />
                              <span>{session.duration}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className={`${getStatusBadge(session.status)} h-8 px-4 rounded-lg font-semibold`}>
                        {getStatusLabel(session.status)}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Load More */}
            <button className="text-sm text-sky-600 hover:underline text-center">
              Load More Sessions
            </button>
          </div>
        </Card>

        {/* My Assignments */}
        <Card className="border border-input rounded-2xl p-4">
          <div className="flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">My Assignments</h2>
              <button className="text-sm text-sky-600 hover:underline">View all</button>
            </div>

            {/* Assignments List */}
            <div className="flex flex-col gap-2 flex-1">
              {assignments.map((assignment) => (
                <Card key={assignment.id} className="border border-input rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-stone-100 rounded-lg p-6 flex items-center justify-center">
                        <PencilLine className="w-6 h-6 text-stone-600" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <h3 className="text-base font-medium text-foreground">
                          {assignment.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{assignment.description}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{assignment.dueDate}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getStatusBadge(assignment.status)} h-8 px-4 rounded-lg font-semibold`}>
                      {getStatusLabel(assignment.status)}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>

            {/* Load More */}
            <button className="text-sm text-sky-600 hover:underline text-center">
              Load More Assignments
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

