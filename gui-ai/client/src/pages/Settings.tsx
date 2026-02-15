import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Database,
  RefreshCw,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PageLoader } from '../components/common/LoadingSpinner';
import { useGatewayQuery } from '../hooks/useGatewayRPC';
import type { StatusResponse } from '../lib/gateway-types';

interface SettingsData {
  notifications: {
    taskComplete: boolean;
    suggestions: boolean;
    messages: boolean;
    browserNotifications: boolean;
  };
  appearance: {
    theme: 'dark' | 'light' | 'system';
    compactMode: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
  };
  data: {
    autoBackup: boolean;
    retentionDays: number;
  };
}

// Settings section component
function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-md bg-terminal-elevated text-primary-400">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-medium text-terminal-text">{title}</h3>
          <p className="text-xs text-terminal-text-secondary">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

// Toggle setting
function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <div>
        <p className="text-sm text-terminal-text">{label}</p>
        {description && <p className="text-xs text-terminal-text-muted">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? 'bg-primary-500' : 'bg-terminal-elevated'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

// Select setting
function SelectSetting({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-terminal-text">{label}</p>
        {description && <p className="text-xs text-terminal-text-muted">{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input w-32 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: gatewayStatus } = useGatewayQuery<StatusResponse>('status', undefined, { staleTime: 30_000 });

  // Fetch settings
  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<SettingsData>) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  // Clear data mutation
  const clearData = useMutation({
    mutationFn: async (type: 'chat' | 'tasks' | 'all') => {
      const res = await fetch(`/api/settings/clear/${type}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to clear data');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const handleSettingChange = (path: string, value: unknown) => {
    if (!settings) return;

    const parts = path.split('.');
    const updates = { ...settings };
    let current: Record<string, unknown> = updates;

    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
    updateSettings.mutate(updates);
  };

  if (isLoading || !settings) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <h1 className="panel-title">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Notifications */}
          <SettingsSection
            icon={Bell}
            title="Notifications"
            description="Configure how you receive notifications"
          >
            <ToggleSetting
              label="Task Completion"
              description="Notify when tasks are completed"
              checked={settings.notifications.taskComplete}
              onChange={(v) => handleSettingChange('notifications.taskComplete', v)}
            />
            <ToggleSetting
              label="AI Suggestions"
              description="Notify when AI has new suggestions"
              checked={settings.notifications.suggestions}
              onChange={(v) => handleSettingChange('notifications.suggestions', v)}
            />
            <ToggleSetting
              label="Messages"
              description="Notify for new messages"
              checked={settings.notifications.messages}
              onChange={(v) => handleSettingChange('notifications.messages', v)}
            />
            <ToggleSetting
              label="Browser Notifications"
              description="Show desktop notifications"
              checked={settings.notifications.browserNotifications}
              onChange={(v) => handleSettingChange('notifications.browserNotifications', v)}
            />
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection
            icon={Moon}
            title="Appearance"
            description="Customize the look and feel"
          >
            <SelectSetting
              label="Theme"
              value={settings.appearance.theme}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'system', label: 'System' },
              ]}
              onChange={(v) => handleSettingChange('appearance.theme', v)}
            />
            <ToggleSetting
              label="Compact Mode"
              description="Reduce spacing for more content"
              checked={settings.appearance.compactMode}
              onChange={(v) => handleSettingChange('appearance.compactMode', v)}
            />
          </SettingsSection>

          {/* Privacy */}
          <SettingsSection
            icon={Shield}
            title="Privacy"
            description="Control your data and privacy settings"
          >
            <ToggleSetting
              label="Usage Analytics"
              description="Help improve YoYo AI with anonymous usage data"
              checked={settings.privacy.analytics}
              onChange={(v) => handleSettingChange('privacy.analytics', v)}
            />
            <ToggleSetting
              label="Crash Reports"
              description="Automatically send crash reports"
              checked={settings.privacy.crashReports}
              onChange={(v) => handleSettingChange('privacy.crashReports', v)}
            />
          </SettingsSection>

          {/* Data Management */}
          <SettingsSection
            icon={Database}
            title="Data Management"
            description="Manage your stored data"
          >
            <ToggleSetting
              label="Auto Backup"
              description="Automatically backup your data"
              checked={settings.data.autoBackup}
              onChange={(v) => handleSettingChange('data.autoBackup', v)}
            />
            <SelectSetting
              label="Data Retention"
              description="How long to keep old data"
              value={String(settings.data.retentionDays)}
              options={[
                { value: '30', label: '30 days' },
                { value: '60', label: '60 days' },
                { value: '90', label: '90 days' },
                { value: '365', label: '1 year' },
                { value: '-1', label: 'Forever' },
              ]}
              onChange={(v) => handleSettingChange('data.retentionDays', parseInt(v))}
            />

            <div className="pt-3 border-t border-terminal-border">
              <p className="text-sm text-terminal-text mb-3">Clear Data</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => clearData.mutate('chat')}
                  loading={clearData.isPending}
                >
                  Clear Chat History
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => clearData.mutate('tasks')}
                  loading={clearData.isPending}
                >
                  Clear Tasks
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                      clearData.mutate('all');
                    }
                  }}
                  loading={clearData.isPending}
                >
                  Clear All Data
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t border-terminal-border">
              <p className="text-sm text-terminal-text mb-3">Export / Import</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary">
                  <Download className="w-3 h-3" /> Export Data
                </Button>
                <Button size="sm" variant="secondary">
                  <Upload className="w-3 h-3" /> Import Data
                </Button>
              </div>
            </div>
          </SettingsSection>

          {/* About */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-terminal-text">YoYo AI Workspace</h3>
                <p className="text-xs text-terminal-text-secondary">Version {gatewayStatus?.version || '...'}</p>
              </div>
              <Badge variant="accent">Beta</Badge>
            </div>
            <p className="text-xs text-terminal-text-muted mt-2">
              Part of the YoYo Dev AI platform. For support, visit the documentation or contact us.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
