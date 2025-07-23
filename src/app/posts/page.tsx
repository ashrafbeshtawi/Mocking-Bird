'use client';

import { useState } from 'react';

interface Post {
  id: string;
  story?: string;
  created_time?: string;
}

export default function PagePostsView() {
  const [pageId, setPageId] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    setError('');
    setPosts([]);
    setLoading(true);

    try {
      const res = await fetch(`/api/page-posts?pageId=${pageId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setPosts(data.posts.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">📄 Facebook Page Posts Viewer</h1>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Enter Facebook Page ID"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleFetch}
            disabled={!pageId || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch Posts'}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {posts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm text-gray-700">
              <thead>
                <tr className="bg-gray-200 text-left">
                  <th className="py-2 px-4">🆔 ID</th>
                  <th className="py-2 px-4">📝 Message</th>
                  <th className="py-2 px-4">📅 Created</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-t">
                    <td className="py-2 px-4 font-mono">{post.id}</td>
                    <td className="py-2 px-4">
                      {post.story ? post.story : <em className="text-gray-400">No story</em>}
                    </td>
                    <td className="py-2 px-4">
                      {post.created_time
                        ? new Date(post.created_time).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {posts.length === 0 && !loading && !error && (
          <p className="text-gray-500 text-sm italic">No posts to display.</p>
        )}
      </div>
    </main>
  );
}
