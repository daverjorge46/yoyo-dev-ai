import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Mail,
  Calendar,
  FileText,
  Search,
  BarChart3,
  Settings2,
  Plus,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SearchInput } from '../components/common/SearchInput';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoader } from '../components/common/LoadingSpinner';
import type { AutomationTemplate, Automation } from '../types';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  calendar: Calendar,
  documents: FileText,
  research: Search,
  reports: BarChart3,
  general: Settings2,
};

const CATEGORY_COLORS: Record<string, string> = {
  email: 'text-info-light',
  calendar: 'text-accent-400',
  documents: 'text-primary-400',
  research: 'text-success-light',
  reports: 'text-warning-light',
  general: 'text-terminal-text-secondary',
};

// Template card
function TemplateCard({
  template,
  onClick,
}: {
  template: AutomationTemplate;
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICONS[template.category] || Settings2;
  const iconColor = CATEGORY_COLORS[template.category] || 'text-terminal-text-secondary';

  return (
    <Card variant="interactive" className="p-4" onClick={onClick}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md bg-terminal-elevated ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-terminal-text mb-1">{template.name}</h4>
          <p className="text-xs text-terminal-text-secondary line-clamp-2">{template.description}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < template.complexity ? 'bg-primary-400' : 'bg-terminal-border'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-terminal-text-muted">{template.estimatedDuration}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-terminal-text-muted" />
      </div>
    </Card>
  );
}

// Active automation card
function AutomationCard({
  automation,
  template,
  onToggle,
  onDelete,
  onRun,
}: {
  automation: Automation;
  template?: AutomationTemplate;
  onToggle: () => void;
  onDelete: () => void;
  onRun: () => void;
}) {
  const Icon = template ? CATEGORY_ICONS[template.category] || Settings2 : Settings2;
  const iconColor = template
    ? CATEGORY_COLORS[template.category] || 'text-terminal-text-secondary'
    : 'text-terminal-text-secondary';

  return (
    <Card variant={automation.enabled ? 'accent' : 'default'} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-md bg-terminal-elevated ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-terminal-text">{automation.name}</h4>
            <p className="text-xs text-terminal-text-secondary">
              {template?.name || 'Custom automation'}
            </p>
          </div>
        </div>
        <Badge variant={automation.enabled ? 'success' : 'muted'}>
          {automation.enabled ? 'Active' : 'Paused'}
        </Badge>
      </div>

      {automation.schedule && (
        <div className="flex items-center gap-2 text-xs text-terminal-text-muted mb-3">
          <Clock className="w-3 h-3" />
          {automation.schedule.type === 'recurring'
            ? `${automation.schedule.frequency} at ${automation.schedule.time}`
            : automation.schedule.type}
        </div>
      )}

      {automation.lastRun && (
        <p className="text-xs text-terminal-text-muted mb-3">
          Last run: {new Date(automation.lastRun).toLocaleString()}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onToggle}>
          {automation.enabled ? (
            <>
              <Pause className="w-3 h-3" /> Pause
            </>
          ) : (
            <>
              <Play className="w-3 h-3" /> Enable
            </>
          )}
        </Button>
        <Button size="sm" variant="ghost" onClick={onRun}>
          <Play className="w-3 h-3" /> Run Now
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
}

// Template wizard modal
function TemplateWizard({
  template,
  onClose,
  onSubmit,
}: {
  template: AutomationTemplate;
  onClose: () => void;
  onSubmit: (config: Record<string, unknown>) => void;
}) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Record<string, unknown>>({
    name: `My ${template.name}`,
    ...template.defaultParams,
  });

  const currentStep = template.steps[step];
  const isLastStep = step === template.steps.length - 1;

  const handleFieldChange = (name: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (isLastStep) {
      onSubmit(config);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg mx-4"
      >
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-terminal-border">
            <div>
              <h3 className="font-semibold text-terminal-text">{template.name}</h3>
              <p className="text-xs text-terminal-text-secondary">
                Step {step + 1} of {template.steps.length}
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-terminal-elevated rounded">
              <X className="w-5 h-5 text-terminal-text-muted" />
            </button>
          </div>

          {/* Step content */}
          <div className="p-4">
            <h4 className="font-medium text-terminal-text mb-1">{currentStep.title}</h4>
            <p className="text-sm text-terminal-text-secondary mb-4">{currentStep.description}</p>

            <div className="space-y-4">
              {currentStep.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-terminal-text mb-1">
                    {field.label}
                    {field.required && <span className="text-error ml-1">*</span>}
                  </label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      className="input"
                      value={(config[field.name] as string) || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.helpText}
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      className="input"
                      value={(config[field.name] as string) || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {field.type === 'time' && (
                    <input
                      type="time"
                      className="input"
                      value={(config[field.name] as string) || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    />
                  )}
                  {field.type === 'boolean' && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(config[field.name] as boolean) || false}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                        className="rounded border-terminal-border bg-terminal-bg text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm text-terminal-text-secondary">{field.helpText}</span>
                    </label>
                  )}
                  {field.helpText && field.type !== 'boolean' && (
                    <p className="text-xs text-terminal-text-muted mt-1">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-terminal-border bg-terminal-elevated/50">
            <Button variant="ghost" onClick={step > 0 ? () => setStep((s) => s - 1) : onClose}>
              {step > 0 ? 'Back' : 'Cancel'}
            </Button>
            <Button onClick={handleNext}>{isLastStep ? 'Create Automation' : 'Next'}</Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default function Automation() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'active'>('templates');

  // Fetch templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery<AutomationTemplate[]>({
    queryKey: ['automation', 'templates'],
    queryFn: async () => {
      const res = await fetch('/api/automation/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      return data.templates || [];
    },
  });

  // Fetch active automations
  const { data: automations = [], isLoading: loadingAutomations } = useQuery<Automation[]>({
    queryKey: ['automation', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/automation/active');
      if (!res.ok) throw new Error('Failed to fetch automations');
      const data = await res.json();
      return data.automations || [];
    },
  });

  // Create automation mutation
  const createAutomation = useMutation({
    mutationFn: async (config: Record<string, unknown>) => {
      const res = await fetch('/api/automation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate?.id,
          config,
        }),
      });
      if (!res.ok) throw new Error('Failed to create automation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', 'active'] });
      setSelectedTemplate(null);
      setActiveTab('active');
    },
  });

  // Toggle automation mutation
  const toggleAutomation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/automation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to update automation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', 'active'] });
    },
  });

  // Delete automation mutation
  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete automation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', 'active'] });
    },
  });

  // Run automation mutation
  const runAutomation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/${id}/run`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run automation');
      return res.json();
    },
  });

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(templates.map((t) => t.category))];

  const isLoading = loadingTemplates || loadingAutomations;

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <h1 className="panel-title">Automation</h1>
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'templates'
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-terminal-text-secondary hover:text-terminal-text'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'active'
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-terminal-text-secondary hover:text-terminal-text'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Active ({automations.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'templates' ? (
          <>
            {/* Search and filters */}
            <div className="flex items-center gap-4 mb-6">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search templates..."
                className="w-64"
              />
              <div className="flex items-center gap-2">
                <button
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    !selectedCategory
                      ? 'bg-terminal-elevated text-terminal-text'
                      : 'text-terminal-text-secondary hover:text-terminal-text'
                  }`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </button>
                {categories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat] || Settings2;
                  return (
                    <button
                      key={cat}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
                        selectedCategory === cat
                          ? 'bg-terminal-elevated text-terminal-text'
                          : 'text-terminal-text-secondary hover:text-terminal-text'
                      }`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <Icon className="w-3 h-3" />
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Templates grid */}
            {filteredTemplates.length === 0 ? (
              <EmptyState
                icon={Wand2}
                title="No templates found"
                description="Try adjusting your search or filter criteria."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => setSelectedTemplate(template)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Active automations */}
            {automations.length === 0 ? (
              <EmptyState
                icon={Wand2}
                title="No active automations"
                description="Create an automation from a template to get started."
                action={{ label: 'Browse Templates', onClick: () => setActiveTab('templates') }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {automations.map((automation) => (
                  <AutomationCard
                    key={automation.id}
                    automation={automation}
                    template={templates.find((t) => t.id === automation.templateId)}
                    onToggle={() =>
                      toggleAutomation.mutate({ id: automation.id, enabled: !automation.enabled })
                    }
                    onDelete={() => deleteAutomation.mutate(automation.id)}
                    onRun={() => runAutomation.mutate(automation.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Template wizard modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <TemplateWizard
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onSubmit={(config) => createAutomation.mutate(config)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
