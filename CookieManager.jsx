import React, { useState, useEffect } from 'react';
import { Cookie, CheckCircle2, AlertCircle, Upload } from 'lucide-react';

export default function CookieManager() {
    const [cookies, setCookies] = useState('');
    const [status, setStatus] = useState({ exists: false, lastModified: null });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchCookieStatus();
    }, []);

    const fetchCookieStatus = async () => {
        try {
            const response = await fetch('/api/cookies-status');
            const data = await response.json();
            setStatus(data);
        } catch (err) {
            console.error('Failed to fetch cookie status:', err);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch('/api/update-cookies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cookies })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Cookies updated successfully!');
                setCookies('');
                fetchCookieStatus();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage(data.error || 'Failed to update cookies');
            }
        } catch (err) {
            setMessage('Error updating cookies: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportFromBrowser = () => {
        // Instructions for exporting cookies
        const instructions = `
To export YouTube cookies from your browser:

1. Install a cookie export extension:
   - Chrome: "Get cookies.txt LOCALLY" or "Cookie-Editor"
   - Firefox: "cookies.txt" extension

2. Go to youtube.com and make sure you're logged in

3. Use the extension to export cookies for youtube.com

4. Copy the entire cookie file content and paste it below

Or manually:
- Open browser DevTools (F12)
- Go to Application/Storage > Cookies > https://www.youtube.com
- Copy cookie values (this is more complex)
        `;
        alert(instructions);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950 text-slate-100">
            <div className="w-full max-w-2xl">
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="relative p-8 pb-6 border-b border-white/5">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-500">
                                <Cookie size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Cookie Manager</h1>
                                <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-1">Update YouTube Authentication</p>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="p-8 space-y-6">
                        <div className="bg-slate-950/50 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {status.exists && status.hasContent ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            {status.exists && status.hasContent ? 'Cookies Active' : 'No Cookies Set'}
                                        </p>
                                        {status.lastModified && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Last updated: {new Date(status.lastModified).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {status.exists && status.hasContent && (
                                    <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                                        {status.size} bytes
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                            <p className="text-sm text-blue-300 font-semibold mb-2">How to get cookies:</p>
                            <ol className="text-xs text-blue-200 space-y-1 list-decimal list-inside">
                                <li>Install "Get cookies.txt LOCALLY" extension (Chrome/Edge) or "cookies.txt" (Firefox)</li>
                                <li>Go to <span className="font-mono bg-slate-900 px-1 rounded">youtube.com</span> and ensure you're logged in</li>
                                <li>Click the extension icon → Export cookies for youtube.com</li>
                                <li>Copy the entire content and paste below</li>
                            </ol>
                            <button
                                onClick={handleExportFromBrowser}
                                className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                                View detailed instructions
                            </button>
                        </div>

                        {/* Cookie Input */}
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                                    Paste Cookie File Content
                                </label>
                                <textarea
                                    value={cookies}
                                    onChange={(e) => setCookies(e.target.value)}
                                    placeholder="# Netscape HTTP Cookie File&#10;# Paste your exported cookies here..."
                                    className="w-full h-64 bg-slate-950/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all font-mono text-xs"
                                    required
                                />
                            </div>

                            {/* Message */}
                            {message && (
                                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
                                    message.includes('success') 
                                        ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                                        : 'bg-red-500/10 border border-red-500/20 text-red-300'
                                }`}>
                                    {message.includes('success') ? (
                                        <CheckCircle2 size={18} />
                                    ) : (
                                        <AlertCircle size={18} />
                                    )}
                                    {message}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !cookies.trim()}
                                className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-300 flex items-center justify-center gap-3 ${
                                    loading || !cookies.trim()
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-900/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0'
                                }`}
                            >
                                <Upload size={20} />
                                {loading ? 'Updating...' : 'Update Cookies'}
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="bg-black/20 p-4 rounded-xl text-center border border-white/5">
                            <p className="text-xs text-slate-500">
                                Cookies are stored securely on the server. Update them when YouTube blocks requests.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
