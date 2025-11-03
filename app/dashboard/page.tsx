// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Key, 
  BarChart3, 
  Settings, 
  Copy, 
  Trash2, 
  Plus,
  Check,
  AlertCircle,
  TrendingUp,
  Globe,
  Cpu,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  name: string;
  key?: string;
  lastUsed: string | null;
  createdAt: string;
  expiresAt: string;
}

interface UsageStats {
  totalTranslations: number;
  totalTokens: number;
  totalCost: number;
  mostUsedModel: string;
  averageResponseTime: number;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchApiKeys();
    fetchUsageStats();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/keys');
      const data = await response.json();
      setApiKeys(data);
    } catch (error) {
      toast.error('Failed to load API keys');
    }
  };

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/usage/stats');
      const data = await response.json();
      setUsage(data);
    } catch (error) {
      console.error('Failed to load usage stats');
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setIsCreatingKey(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      const data = await response.json();
      if (data.key) {
        setShowNewKey(data.key);
        setApiKeys([...apiKeys, data]);
        setNewKeyName('');
        toast.success('API key created successfully');
      }
    } catch (error) {
      toast.error('Failed to create API key');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
      setApiKeys(apiKeys.filter(key => key.id !== id));
      toast.success('API key deleted');
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Welcome back, {session?.user?.name || session?.user?.email}
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'api-keys', 'usage', 'billing'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Translations</p>
                  <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-gray-100">
                    {usage?.totalTranslations.toLocaleString() || '0'}
                  </p>
                </div>
                <Globe className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tokens Used</p>
                  <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-gray-100">
                    {usage?.totalTokens.toLocaleString() || '0'}
                  </p>
                </div>
                <Cpu className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
                  <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-gray-100">
                    ${usage?.totalCost.toFixed(2) || '0.00'}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
                  <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-gray-100">
                    {usage?.averageResponseTime.toFixed(1) || '0'}ms
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div>
            {/* Create New Key */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Create New API Key</h3>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g., Production API)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={createApiKey}
                  disabled={isCreatingKey}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Key
                </button>
              </div>

              {/* Show new key once */}
              {showNewKey && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Save your API key
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        This is the only time you'll see this key. Store it securely.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded text-sm font-mono text-gray-900 dark:text-gray-100">
                          {showNewKey}
                        </code>
                        <button
                          onClick={() => {
                            copyToClipboard(showNewKey);
                            setShowNewKey(null);
                          }}
                          className="px-3 py-2 bg-amber-600 dark:bg-amber-700 text-white rounded hover:bg-amber-700 dark:hover:bg-amber-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* API Keys List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Active API Keys</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {apiKeys.map((key) => (
                  <div key={key.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{key.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Created {new Date(key.createdAt).toLocaleDateString()} ·
                            {key.lastUsed
                              ? ` Last used ${new Date(key.lastUsed).toLocaleDateString()}`
                              : ' Never used'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      className="p-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {apiKeys.length === 0 && (
                  <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No API keys yet. Create one to get started.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Usage Analytics</h3>
            <div className="space-y-6">
              {/* Usage chart would go here */}
              <div className="h-64 bg-gray-50 dark:bg-gray-900 rounded flex items-center justify-center text-gray-500 dark:text-gray-400">
                Usage charts will be displayed here
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Billing & Subscription</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Current Plan</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{session?.user?.tier || 'Free'}</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Upgrade Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
