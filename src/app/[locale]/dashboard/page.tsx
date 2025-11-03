'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Smile, Wrench, BrainCircuit, User, UserPlus, Plus } from 'lucide-react';

export default function DashboardPage() {
  const t = useTranslations('dashboard.page');

  // Mock data for the dashboard
  const stats = [
    {
      title: t('totalPatients'),
      value: '12',
      subtitle: t('fromLastMonth'),
    },
    {
      title: t('activeSessions'),
      value: '8',
      subtitle: t('scheduledToday'),
    },
    {
      title: t('completedSessions'),
      value: '47',
      subtitle: t('thisMonth'),
    },
    {
      title: t('pendingAssignments'),
      value: '5',
      subtitle: t('dueToday'),
    },
  ];

  const assignments = [
    {
      id: 1,
      title: 'Mood Tracking Exercising',
      patient: 'Sarah M.',
      dueDate: 'Today',
      status: t('inProgress'),
      icon: Smile,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      badgeClass: 'bg-green-50 text-green-600 border-transparent',
    },
    {
      id: 2,
      title: 'Cognitive Restructuring Worksheet',
      patient: 'John D.',
      dueDate: 'Today',
      status: t('pending'),
      icon: Wrench,
      iconBg: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      badgeClass: 'bg-orange-50 text-orange-500 border-transparent',
    },
    {
      id: 3,
      title: 'Mindfulness Practice Log',
      patient: 'John D.',
      dueDate: 'Today',
      status: t('completed'),
      icon: BrainCircuit,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      badgeClass: 'bg-neutral-200 text-muted-foreground border-transparent',
    },
  ];

  const recentSessions = [
    {
      id: 1,
      patient: 'Sarah M.',
      date: '11/03/2025, 1:15 PM - 2:00 PM',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      id: 2,
      patient: 'Jhon D.',
      date: '11/03/2025, 7:00 PM - 8:00 AM',
      iconBg: 'bg-stone-100',
      iconColor: 'text-stone-600',
    },
    {
      id: 3,
      patient: 'Carla F.',
      date: '11/03/2025, 7:00 PM - 8:00 AM',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-16 px-40">
      {/* Page Title & Actions */}
      <div className="flex items-center justify-between px-6 py-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="default">
            <UserPlus className="w-5 h-5" />
            {t('addPatient')}
          </Button>
          <Button variant="default" size="default">
            <Plus className="w-5 h-5" />
            {t('startNewSession')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 px-6">
        {stats.map((stat, index) => (
          <Card key={index} className="border border-input rounded-2xl p-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-medium text-foreground">
                {stat.title}
              </h3>
              <p className="text-4xl font-bold text-primary leading-tight">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="flex flex-col gap-6">
        {/* Assignments Section */}
        <div className="px-6">
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-foreground">
              {t('assignments')}
            </h2>
            <div className="flex flex-col gap-2">
              {assignments.map((assignment) => {
                const Icon = assignment.icon;
                return (
                  <Card
                    key={assignment.id}
                    className="border border-input rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div
                          className={`w-14 h-14 rounded-lg flex items-center justify-center ${assignment.iconBg}`}
                        >
                          <Icon className={`w-6 h-6 ${assignment.iconColor}`} />
                        </div>
                        {/* Info */}
                        <div className="flex flex-col gap-2">
                          <h3 className="text-base font-medium text-foreground">
                            {assignment.title}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span>
                              {t('assignedTo')}{' '}
                              <span className="text-primary">
                                {assignment.patient}
                              </span>
                            </span>
                            <span>•</span>
                            <Calendar className="w-4 h-4" />
                            <span>{t('due')}: {assignment.dueDate}</span>
                          </div>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Badge className={`h-8 px-4 rounded-lg font-semibold ${assignment.badgeClass}`}>
                          {assignment.status}
                        </Badge>
                        <Button variant="secondary" size="sm" className="h-8 px-3">
                          {t('view')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Sessions Section */}
        <div className="px-6">
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-foreground">
              {t('recentSessions')}
            </h2>
            <div className="flex flex-col gap-2">
              {recentSessions.map((session) => (
                <Card
                  key={session.id}
                  className="border border-input rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div
                        className={`w-14 h-14 rounded-lg flex items-center justify-center ${session.iconBg}`}
                      >
                        <User className={`w-6 h-6 ${session.iconColor}`} />
                      </div>
                      {/* Info */}
                      <div className="flex flex-col gap-2">
                        <h3 className="text-base font-medium text-foreground">
                          {session.patient}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{session.date}</span>
                        </div>
                      </div>
                    </div>
                    {/* Action */}
                    <Button variant="secondary" size="sm" className="h-8 px-3">
                      View
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
