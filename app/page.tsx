import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-md p-8">
        <div className="flex flex-col items-center justify-center mb-8">
          <h1 className="text-4xl font-bold text-center mb-4">AI Personality Pal</h1>
          <p className="text-lg text-center text-gray-600 mb-6">
            Create your digital twin powered by AI. Share your personality and preferences to chat with an AI that mimics your style and interests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">How It Works</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Create a digital twin by sharing your bio</li>
              <li>Connect your Spotify and Letterboxd accounts (optional)</li>
              <li>The AI analyzes your preferences</li>
              <li>Chat with your personality twin!</li>
            </ol>
          </div>

          <div className="bg-green-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Features</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Personalized AI responses based on your style</li>
              <li>Optional integration with music and movie preferences</li>
              <li>Private and secure communication</li>
              <li>Continuously learning and improving</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-center">
          <Link href="/create" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200">
            Create Your Digital Twin
          </Link>
        </div>
      </div>
    </main>
  );
}
