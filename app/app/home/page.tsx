export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="text-center max-w-md bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Synecdoche®</h1>
        <p className="text-gray-600 mb-6">Stay updated with our newsletter</p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Subscribe
          </button>
        </div>
      </div>
    </div>
  )
}