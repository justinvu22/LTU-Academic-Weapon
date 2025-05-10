// app/page.tsx

export default function HomePage() {
  return (
    <div className="text-white space-y-8">
      {/* Featured Community Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Featured Community</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card p-4 rounded-lg transition-transform duration-200 hover:scale-105">
            <h3 className="text-xl font-semibold mb-2">Virtual Reality</h3>
            <p className="text-sm text-gray-400">
              Explore VR and immerse yourself in cutting-edge gameplay.
            </p>
          </div>
          <div className="bg-card p-4 rounded-lg transition-transform duration-200 hover:scale-105">
            <h3 className="text-xl font-semibold mb-2">Game Play</h3>
            <p className="text-sm text-gray-400">
              Join the latest gaming sessions. Chat, stream, and compete.
            </p>
          </div>
        </div>
      </section>

      {/* Popular Right Now */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Popular Right Now</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg transition-transform duration-200 hover:scale-105">
            <h3 className="text-lg font-semibold">3D Art</h3>
            <p className="text-sm text-gray-400">Creative digital art and design.</p>
          </div>
          <div className="bg-card p-4 rounded-lg transition-transform duration-200 hover:scale-105">
            <h3 className="text-lg font-semibold">NFT</h3>
            <p className="text-sm text-gray-400">Discover and collect unique digital assets.</p>
          </div>
          {/* More cards as desired */}
        </div>
      </section>

      {/* Recent Add */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Recent Add</h2>
        <div className="bg-card p-4 rounded-lg transition-transform duration-200 hover:scale-105">
          <h3 className="text-lg font-semibold">New Community Launch</h3>
          <p className="text-sm text-gray-400">
            Join our newly launched AI & ML community.
          </p>
        </div>
      </section>
    </div>
  );
}
