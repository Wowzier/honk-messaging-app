'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface JourneyTransitionProps {
  onComplete: () => void;
  recipientUsername?: string;
}

export function JourneyTransition({ onComplete, recipientUsername }: JourneyTransitionProps) {
  const [phase, setPhase] = useState<'finding' | 'found' | 'starting' | 'complete'>('finding');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('found'), 2000),
      setTimeout(() => setPhase('starting'), 4000),
      setTimeout(() => {
        setPhase('complete');
        setTimeout(onComplete, 1000);
      }, 6000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
    >
      <div className="text-center">
        <AnimatePresence mode="wait">
          {phase === 'finding' && (
            <motion.div
              key="finding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-8xl"
              >
                🔍
              </motion.div>
              <motion.h1
                className="text-5xl font-bold text-white"
                style={{
                  fontFamily: '"Courier New", monospace',
                  textShadow: '0 0 20px rgba(255,255,255,0.5)',
                }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                FINDING USER...
              </motion.h1>
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-white rounded-full"
                    animate={{
                      y: [0, -20, 0],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'found' && (
            <motion.div
              key="found"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 10
                }}
                className="text-8xl"
              >
                ✅
              </motion.div>
              <motion.h1
                className="text-5xl font-bold text-green-400"
                style={{
                  fontFamily: '"Courier New", monospace',
                  textShadow: '0 0 30px rgba(74, 222, 128, 0.8)',
                }}
              >
                FOUND A USER!
              </motion.h1>
              {recipientUsername && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-2xl text-white"
                >
                  Sending to: <span className="font-bold">{recipientUsername}</span>
                </motion.p>
              )}
            </motion.div>
          )}

          {phase === 'starting' && (
            <motion.div
              key="starting"
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 2 }}
              className="space-y-6"
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="text-8xl"
              >
                🦆
              </motion.div>
              <motion.h1
                className="text-6xl font-bold text-yellow-400"
                style={{
                  fontFamily: '"Courier New", monospace',
                  textShadow: '0 0 40px rgba(250, 204, 21, 0.9)',
                }}
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                }}
              >
                STARTING ADVENTURE!
              </motion.h1>
              <motion.div
                className="flex justify-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {Array.from("LOADING...").map((char, i) => (
                  <motion.span
                    key={i}
                    className="text-2xl text-white font-mono"
                    animate={{
                      y: [0, -10, 0],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
