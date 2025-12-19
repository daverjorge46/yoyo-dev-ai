/**
 * CreateSpecModal Component
 *
 * Multi-step wizard for creating a new specification.
 */

import { useState } from 'react';
import { X, FileText, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateSpecInput {
  name: string;
  overview: string;
  scope?: string;
  deliverables?: string[];
  outOfScope?: string[];
}

interface CreateSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (specId: string) => void;
}

async function createSpec(input: CreateSpecInput) {
  const res = await fetch('/api/specs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create specification');
  }

  return res.json();
}

const STEPS = ['Basic Info', 'Scope', 'Deliverables'];

export function CreateSpecModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateSpecModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  // Form state
  const [name, setName] = useState('');
  const [overview, setOverview] = useState('');
  const [scope, setScope] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [outOfScope, setOutOfScope] = useState<string[]>([]);
  const [newOutOfScope, setNewOutOfScope] = useState('');

  const mutation = useMutation({
    mutationFn: createSpec,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['specs'] });
      onSuccess?.(data.id);
      handleClose();
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    if (mutation.isPending) return;
    setStep(0);
    setName('');
    setOverview('');
    setScope('');
    setDeliverables([]);
    setNewDeliverable('');
    setOutOfScope([]);
    setNewOutOfScope('');
    mutation.reset();
    onClose();
  };

  const addDeliverable = () => {
    if (newDeliverable.trim() && !deliverables.includes(newDeliverable.trim())) {
      setDeliverables([...deliverables, newDeliverable.trim()]);
      setNewDeliverable('');
    }
  };

  const removeDeliverable = (item: string) => {
    setDeliverables(deliverables.filter((d) => d !== item));
  };

  const addOutOfScope = () => {
    if (newOutOfScope.trim() && !outOfScope.includes(newOutOfScope.trim())) {
      setOutOfScope([...outOfScope, newOutOfScope.trim()]);
      setNewOutOfScope('');
    }
  };

  const removeOutOfScope = (item: string) => {
    setOutOfScope(outOfScope.filter((o) => o !== item));
  };

  const handleSubmit = () => {
    if (!name.trim() || !overview.trim()) return;

    mutation.mutate({
      name: name.trim(),
      overview: overview.trim(),
      scope: scope.trim() || undefined,
      deliverables: deliverables.length > 0 ? deliverables : undefined,
      outOfScope: outOfScope.length > 0 ? outOfScope : undefined,
    });
  };

  const canProceed = step === 0 ? name.trim() && overview.trim() : true;
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Specification
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Step {step + 1} of {STEPS.length}: {STEPS[step]}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={mutation.isPending}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2">
            {STEPS.map((stepName, index) => (
              <div key={stepName} className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => index < step && setStep(index)}
                  disabled={index > step || mutation.isPending}
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index === step
                      ? 'bg-indigo-600 text-white'
                      : index < step
                      ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}
                >
                  {index < step ? '✓' : index + 1}
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      index < step
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Step 1: Basic Info */}
          {step === 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Specification Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., User Authentication System"
                  disabled={mutation.isPending}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Overview <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  placeholder="Describe what this feature/system will do..."
                  rows={4}
                  disabled={mutation.isPending}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 resize-none"
                />
              </div>
            </>
          )}

          {/* Step 2: Scope */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Scope Description
                </label>
                <textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="Define the boundaries of this specification..."
                  rows={3}
                  disabled={mutation.isPending}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Out of Scope
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newOutOfScope}
                    onChange={(e) => setNewOutOfScope(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addOutOfScope();
                      }
                    }}
                    placeholder="What is NOT included..."
                    disabled={mutation.isPending}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={addOutOfScope}
                    disabled={mutation.isPending || !newOutOfScope.trim()}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                {outOfScope.length > 0 && (
                  <div className="space-y-1">
                    {outOfScope.map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded text-sm"
                      >
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {item}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeOutOfScope(item)}
                          disabled={mutation.isPending}
                          className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 3: Deliverables */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deliverables
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  What will be produced by this specification?
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newDeliverable}
                    onChange={(e) => setNewDeliverable(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDeliverable();
                      }
                    }}
                    placeholder="e.g., Login page component"
                    disabled={mutation.isPending}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={addDeliverable}
                    disabled={mutation.isPending || !newDeliverable.trim()}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                {deliverables.length > 0 && (
                  <div className="space-y-1">
                    {deliverables.map((item, index) => (
                      <div
                        key={item}
                        className="flex items-center justify-between px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded text-sm"
                      >
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {index + 1}. {item}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDeliverable(item)}
                          disabled={mutation.isPending}
                          className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {deliverables.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">
                    No deliverables added yet
                  </p>
                )}
              </div>

              {/* Summary Preview */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary
                </h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex">
                    <dt className="text-gray-500 dark:text-gray-400 w-24">Name:</dt>
                    <dd className="text-gray-900 dark:text-white">{name}</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-500 dark:text-gray-400 w-24">Deliverables:</dt>
                    <dd className="text-gray-900 dark:text-white">
                      {deliverables.length || 'None'}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-500 dark:text-gray-400 w-24">Out of scope:</dt>
                    <dd className="text-gray-900 dark:text-white">
                      {outOfScope.length || 'None'}
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          )}

          {/* Error message */}
          {mutation.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to create specification'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0 || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={mutation.isPending}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || mutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Spec
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed || mutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
