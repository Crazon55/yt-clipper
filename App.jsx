import React, { useState } from 'react';
import { AlertCircle, Clock, Youtube, Loader2, Scissors, CheckCircle2, Film } from 'lucide-react';

export default function App() {
    const [url, setUrl] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    const handleDownload = async (e) => {
        e.preventDefault();
        setError('');
        setStatus('Initializing engine...');
        setLoading(true);

        try {
            if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
                throw new Error('Please enter a valid YouTube URL');
            }

            setStatus('Processing video (this takes a moment)...');

            const apiUrl = import.meta.env.VITE_API_URL || '/api/clip';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    startTime: start,
                    endTime: end
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Clipping failed');
            }

            setStatus('Downloading file...');
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `clip_${Date.now()}.mp4`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setStatus('Done! Check your downloads.');
            setTimeout(() => setStatus(''), 5000);
        } catch (err) {
            setError(err.message);
            setStatus('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950 text-slate-100 selection:bg-red-500/30 relative">
            {/* Cookie Manager Link */}
            <a 
                href="/cookies" 
                className="absolute top-4 right-4 text-xs text-slate-400 hover:text-slate-200 transition-colors underline"
                title="Manage YouTube Cookies"
            >
                Cookie Settings
            </a>

            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-xl">
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">

                    {/* Header */}
                    <div className="relative p-8 pb-6 border-b border-white/5">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
                        <div className="flex items-center gap-5">
                            <div className="flex items-center justify-center w-12 h-12 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500">
                                <Youtube size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">Clipper<span className="text-red-500">Pro</span></h1>
                                <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-1">Video Extraction Engine</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleDownload} className="p-8 space-y-6">

                        {/* URL Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">YouTube Source URL</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none z-20">
                                    <Film className="w-5 h-5 text-slate-500 group-focus-within:text-red-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Paste YouTube link here..."
                                    className="input-with-icon w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/50 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Timing Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Start Time</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none z-20">
                                        <Clock className="w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={start}
                                        onChange={(e) => setStart(e.target.value)}
                                        placeholder="00:00:00"
                                        className="input-with-icon w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">End Time</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none z-20">
                                        <Clock className="w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={end}
                                        onChange={(e) => setEnd(e.target.value)}
                                        placeholder="Full Video"
                                        className="input-with-icon w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status Area */}
                        <div className="min-h-[50px] flex items-center">
                            {error && (
                                <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}
                            {status && !error && (
                                <div className="w-full bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold animate-pulse">
                                    {status.includes('Done') ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Loader2 size={16} className="animate-spin" />}
                                    {status}
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-5 rounded-2xl font-bold text-lg tracking-wide transition-all duration-300 flex items-center justify-center gap-3
                            ${loading
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                    : 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/20 hover:shadow-red-600/40 hover:-translate-y-0.5 active:translate-y-0'
                                }`}
                        >
                            {loading ? (
                                <> <Loader2 className="animate-spin" /> PROCESSING </>
                            ) : (
                                <> <Scissors size={20} /> CREATE CLIP </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="bg-black/20 p-6 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-white/5">
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> System Ready
                        </span>
                        <span>Max Duration: 20m • Powered by yt-dlp</span>
                    </div>
                </div>
            </div>
        </div>
    );
}