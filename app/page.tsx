import Link from "next/link"
import { FaBolt, FaFileAlt, FaUserFriends } from "react-icons/fa"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative">
      {/* Logo at the top left */}
      <img src="/light.webp" alt="EOXS Logo" className="absolute top-6 left-8 h-14 w-auto" />

      <main className="z-10 flex flex-col items-center w-full">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center text-gray-900 drop-shadow">Welcome to your personal Ai- Assistant</h1>
        <p className="text-lg text-gray-600 mb-10 text-center max-w-xl">Your smart companion for technology and productivity. Ask anything, upload documents, and get instant, personalized support.</p>

        {/* Flash cards */}
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <div className="bg-white shadow-xl rounded-2xl p-7 w-80 text-center border border-gray-100 hover:shadow-2xl transition group">
            <div className="flex justify-center mb-3">
              <FaBolt className="text-primary text-3xl group-hover:scale-110 transition" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Instant Answers</h2>
            <p className="text-gray-600">Get quick, accurate responses to your questions about technology, and more.</p>
          </div>
          <div className="bg-white shadow-xl rounded-2xl p-7 w-80 text-center border border-gray-100 hover:shadow-2xl transition group">
            <div className="flex justify-center mb-3">
              <FaFileAlt className="text-primary text-3xl group-hover:scale-110 transition" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Document Insights</h2>
            <p className="text-gray-600">Upload documents and let the assistant extract, summarize, and explain key information.</p>
          </div>
          <div className="bg-white shadow-xl rounded-2xl p-7 w-80 text-center border border-gray-100 hover:shadow-2xl transition group">
            <div className="flex justify-center mb-3">
              <FaUserFriends className="text-primary text-3xl group-hover:scale-110 transition" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Personalized Support</h2>
            <p className="text-gray-600">Enjoy a tailored experience that learns from your interactions and adapts to your needs.</p>
          </div>
        </div>

        <Link href="/chat">
          <button className="px-8 py-4 bg-black text-white rounded-xl text-xl font-bold shadow-lg hover:scale-105 hover:bg-gray-900 transition-all duration-200">Chat</button>
        </Link>
      </main>
    </div>
  )
}
