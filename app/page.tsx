export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
      <div className="text-center space-y-8 max-w-4xl mx-auto px-4">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Scientific Translation
          </h1>
          <p className="text-2xl md:text-3xl text-gray-600 dark:text-gray-400">
            AI-Powered B2B Service
          </p>
        </div>

        {/* Description */}
        <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
          Enterprise-grade translation service specialized for scientific and academic texts.
          Powered by multiple LLMs including GPT-4, Claude, and Gemini.
        </p>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">🔬</div>
            <h3 className="text-xl font-semibold mb-2">Specialized Styles</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Physics, Chemistry, Biology, Mathematics, and more
            </p>
          </div>

          <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-xl font-semibold mb-2">Multi-LLM Support</h3>
            <p className="text-gray-600 dark:text-gray-400">
              OpenAI, Anthropic, Google, and Open Source models
            </p>
          </div>

          <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Real-time Streaming</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Stream responses for long texts with batch processing
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center mt-12">
          <a
            href="/translate"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Try Translator
          </a>
          <a
            href="/dashboard"
            className="px-8 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-semibold transition-colors"
          >
            Dashboard
          </a>
          <a
            href="https://github.com/We-are-Humans-Corp/translateAI"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-semibold transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  )
}