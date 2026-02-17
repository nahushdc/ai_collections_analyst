import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { detectQueryIntent, getLoadingMessages } from '../utils/queryIntent';

export default function QueryLoadingState({
  queryText,
  variant = 'standard',
  rotateMessages = true,
  rotationInterval = 2500
}) {
  const [currentMessage, setCurrentMessage] = useState('');
  const intent = useMemo(() => detectQueryIntent(queryText), [queryText]);

  // Setup message rotation
  useEffect(() => {
    const messages = getLoadingMessages(intent);
    let index = 0;
    setCurrentMessage(messages[0]);

    if (!rotateMessages || messages.length <= 1) return;

    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setCurrentMessage(messages[index]);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [intent, rotateMessages, rotationInterval]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-900/20 to-slate-900/40 backdrop-blur-xl p-8">
        {/* Shimmer animation */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

        {/* Content */}
        <div className="relative flex items-center justify-center gap-4">
          <div className="relative">
            <Loader2 size={32} className="animate-spin text-violet-400" />
            <div className="absolute inset-0 animate-ping">
              <Loader2 size={32} className="text-violet-400/20" />
            </div>
          </div>
          <div>
            <p className="mb-1 bg-gradient-to-r from-violet-300 via-purple-300 to-cyan-300 bg-clip-text text-lg font-bold text-transparent">
              {currentMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
