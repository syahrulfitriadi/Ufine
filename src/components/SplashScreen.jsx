import React, { useState, useEffect } from 'react';

const SplashScreen = ({ onFinish }) => {
  const [phase, setPhase] = useState(0); // 0: initial, 1: logo in, 2: text in, 3: fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),   // Logo appears
      setTimeout(() => setPhase(2), 1000),   // Text appears
      setTimeout(() => setPhase(3), 2200),   // Start fade out
      setTimeout(() => onFinish(), 2800),    // Remove splash
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${phase >= 3 ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)' }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 transition-all duration-1000"
          style={{
            background: 'radial-gradient(circle, #86a788, transparent)',
            transform: phase >= 1 ? 'scale(1)' : 'scale(0)',
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-10 transition-all duration-1000 delay-300"
          style={{
            background: 'radial-gradient(circle, #86a788, transparent)',
            transform: phase >= 1 ? 'scale(1)' : 'scale(0)',
          }}
        />
      </div>

      {/* Logo */}
      <div
        className="relative transition-all duration-700 ease-out"
        style={{
          transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.3) translateY(40px)',
          opacity: phase >= 1 ? 1 : 0,
        }}
      >
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(134,167,136,0.15), rgba(134,167,136,0.05))',
            border: '1px solid rgba(134,167,136,0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <img
            src="/icon-512.png"
            alt="UFine"
            className="w-20 h-20 object-contain"
            style={{
              filter: 'drop-shadow(0 4px 12px rgba(134,167,136,0.3))',
            }}
          />
        </div>
        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-3xl transition-all duration-1000"
          style={{
            boxShadow: phase >= 1
              ? '0 0 40px rgba(134,167,136,0.2), 0 0 80px rgba(134,167,136,0.1)'
              : 'none',
          }}
        />
      </div>

      {/* App Name */}
      <div
        className="mt-8 text-center transition-all duration-600 ease-out"
        style={{
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
          opacity: phase >= 2 ? 1 : 0,
        }}
      >
        <h1 className="text-3xl font-bold text-white tracking-tight">
          U<span style={{ color: '#86a788' }}>fine</span>
        </h1>
        <p
          className="text-sm text-slate-400 mt-2 tracking-wide transition-all duration-500 delay-200"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          Your Finance. Simplified.
        </p>
      </div>

      {/* Loading dots */}
      <div
        className="mt-10 flex gap-1.5 transition-all duration-500"
        style={{ opacity: phase >= 2 ? 1 : 0 }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: '#86a788',
              animation: phase >= 2 ? `splash-dot 1.2s infinite ${i * 0.2}s` : 'none',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splash-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
