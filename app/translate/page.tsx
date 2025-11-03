'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function TranslatePage() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('Translation will appear here...');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ru');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [style, setStyle] = useState('academic');
  const [temperature, setTemperature] = useState(30);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [showChanges, setShowChanges] = useState(false);
  const [preserveFormat, setPreserveFormat] = useState(true);
  const [improveGrammar, setImproveGrammar] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load available models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/api/translate');
        const data = await response.json();
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
          // Set default model to the first available one
          setModel(data.models[0]);
        } else {
          console.error('No models available');
          setOutputText('Error: No AI models available. Please check API configuration.');
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        setOutputText('Error: Failed to load available models.');
      }
    };
    loadModels();
  }, []);

  const translateText = async () => {
    const text = inputText.trim();

    if (!text) {
      // Subtle feedback
      const input = document.getElementById('inputText');
      if (input) {
        input.style.borderColor = '#d4a574';
        setTimeout(() => {
          input.style.borderColor = '';
        }, 2000);
      }
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang,
          model,
          style,
          temperature: temperature / 100,
          maxTokens,
          preserveFormat,
          improveGrammar,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setOutputText(data.translation || 'Translation failed');
    } catch (error) {
      console.error('Translation error:', error);
      setOutputText('Error: Failed to translate text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setInputText('');
    setOutputText('Translation will appear here...');
    setShowChanges(false);
  };

  // Load example on mount
  useState(() => {
    const example = `Introduction. The concept of the Stieltjes integral has various applications in mathematical physics. For example, the Stieltjes integral is commonly used to model the behavior of viscoelastic materials, which exhibit continuous and instantaneous changes in stress and strain [1-3]. With the help of the Stieltjes integral, it is possible to provide a uniform description of continuous and discrete quantities, such as the relaxation time spectra of a viscoelastic body [1] and the external loads in beam bending theory [4,5].`;
    setInputText(example);
  });

  return (
    <div className="container max-w-[1440px] mx-auto h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <h1 className="text-sm font-medium text-gray-600">Scientific Text Translator</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor Container */}
        <div className="flex flex-1 bg-gray-50">
          {/* Original Text Panel */}
          <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-600 font-medium">Original</span>
              <select
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
              >
                <option value="auto">Auto-detect</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            <textarea
              id="inputText"
              className="flex-1 p-6 resize-none font-mono text-sm leading-relaxed text-gray-800 bg-white outline-none"
              placeholder="Paste your scientific text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="px-6 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
              {inputText.length.toLocaleString()} / 10,000 characters
            </div>
          </div>

          {/* Translation Panel */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-600 font-medium">Translation</span>
              <select
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              >
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
              </select>
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mb-3" />
                <div className="text-sm text-gray-500">Processing...</div>
              </div>
            ) : (
              <div
                className={`flex-1 p-6 font-mono text-sm leading-relaxed text-gray-800 overflow-y-auto bg-white ${
                  showChanges ? 'show-changes' : ''
                }`}
                dangerouslySetInnerHTML={{ __html: outputText }}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 bg-gray-50 border-l border-gray-200 flex flex-col">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Model Selection */}
            <div className="mb-6">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                LLM
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={availableModels.length === 0}
              >
                {availableModels.length === 0 ? (
                  <option>Loading models...</option>
                ) : (
                  availableModels.map((modelKey) => {
                    const modelNames: Record<string, string> = {
                      'gpt-4o': 'GPT-4o',
                      'gpt-4-turbo': 'GPT-4 Turbo',
                      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
                      'claude-3-opus': 'Claude 3 Opus',
                      'claude-3-sonnet': 'Claude 3 Sonnet',
                      'claude-3-haiku': 'Claude 3 Haiku',
                      'gemini-pro': 'Gemini Pro',
                      'gemini-1.5-pro': 'Gemini 1.5 Pro',
                      'llama-3': 'Llama 3 70B',
                      'mistral-large': 'Mistral Large',
                    };
                    return (
                      <option key={modelKey} value={modelKey}>
                        {modelNames[modelKey] || modelKey}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Style Selection */}
            <div className="mb-6">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Style
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option value="academic">Academic</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="biology">Biology</option>
                <option value="mathematics">Mathematics</option>
                <option value="computer-science">Computer Science</option>
                <option value="medicine">Medicine</option>
                <option value="engineering">Engineering</option>
                <option value="formal">Formal</option>
                <option value="simplified">Simplified</option>
              </select>
            </div>

            <div className="h-px bg-gray-200 my-5" />

            {/* Checkboxes */}
            <div className="space-y-3 mb-6">
              <label className="flex items-center p-3 bg-white border border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors">
                <input
                  type="checkbox"
                  checked={showChanges}
                  onChange={(e) => setShowChanges(e.target.checked)}
                  className="w-4 h-4 mr-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show changes</span>
              </label>

              <label className="flex items-center p-3 bg-white border border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors">
                <input
                  type="checkbox"
                  checked={preserveFormat}
                  onChange={(e) => setPreserveFormat(e.target.checked)}
                  className="w-4 h-4 mr-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Preserve formatting</span>
              </label>

              <label className="flex items-center p-3 bg-white border border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors">
                <input
                  type="checkbox"
                  checked={improveGrammar}
                  onChange={(e) => setImproveGrammar(e.target.checked)}
                  className="w-4 h-4 mr-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Improve grammar</span>
              </label>
            </div>

            <div className="h-px bg-gray-200 my-5" />

            {/* Temperature Slider */}
            <div className="mb-6">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Temperature</label>
              <input
                type="range"
                min="0"
                max="100"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-right text-xs text-gray-500 mt-1">{(temperature / 100).toFixed(2)}</div>
            </div>

            {/* Max Length Slider */}
            <div className="mb-6">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Max length</label>
              <input
                type="range"
                min="500"
                max="4000"
                step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-right text-xs text-gray-500 mt-1">{maxTokens.toLocaleString()} tokens</div>
            </div>

            {/* Buttons */}
            <button
              onClick={translateText}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Translating...' : 'Translate'}
            </button>

            <button
              onClick={clearAll}
              className="w-full py-2.5 px-4 mt-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Styles for show changes */}
      <style jsx>{`
        .show-changes ins {
          background: #e8f5e8;
          text-decoration: none;
          color: #2d5a2d;
          padding: 1px 3px;
          border-radius: 3px;
        }

        .show-changes del {
          background: #fde8e8;
          color: #8b3030;
          padding: 1px 3px;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}