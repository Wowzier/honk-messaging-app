'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [videoError, setVideoError] = useState(false);

  const quickActions = [
    {
      href: '/compose',
      title: 'Compose a postcard',
      description: 'Draft a six-line note and decorate it with seasonal stickers.',
      icon: '📝',
    },
    {
      href: '/inbox',
      title: 'Review your inbox',
      description: 'Catch up on the postcards that landed overnight.',
      icon: '📬',
    },
    {
      href: '/conversations',
      title: 'Continue a conversation',
      description: 'Reply to threads and keep friendships aloft.',
      icon: '💬',
    },
    {
      href: '/weather-demo',
      title: 'Track live flights',
      description: 'Watch ducks navigate weather systems in real time.',
      icon: '🛩️',
    },
  ];

  const workspaceShortcuts = [
    {
      href: '/postcard',
      title: 'Creative studio',
      description: 'Design a postcard with drag-and-drop stickers.',
    },
    {
      href: '/ranking',
      title: 'Ranks & rewards',
      description: 'See how close you are to the next courier badge.',
    },
    {
      href: '/inbox',
      title: 'Delivery overview',
      description: 'Filter and sort everything that has arrived.',
    },
  ];

  const publicFeatures = [
    {
      title: 'Calm, Notion-inspired workspaces',
      description: 'Lay out postcards, journey notes, and weather snapshots in structured sections that feel like a serene document.',
    },
    {
      title: 'Guided postcard composer',
      description: 'Stay focused with a six-line limit, gentle prompts, and playful stickers for each season.',
    },
    {
      title: 'Weather-aware delivery routes',
      description: 'Ducks chart courses around storms, jet streams, and mountain ranges so every message arrives safely.',
    },
    {
      title: 'Mindful messaging',
      description: 'Send thoughtful notes without noisy feeds—just intentional exchanges and a little magic.',
    },
  ];

  const labLinks = [
    {
      href: '/demo',
      label: '🦆 Full demo',
      description: 'Experience the complete Honk storyline in one tour.',
    },
    {
      href: '/weather-demo',
      label: '🌤️ Flight visualizer',
      description: "See how weather shifts each courier's journey.",
    },
    {
      href: '/weather-search',
      label: '🌍 Weather search',
      description: 'Peek at travel conditions before sending a duck abroad.',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Glassmorphism background with animated gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 animate-gradient-shift"></div>
      <div className="fixed inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent backdrop-blur-3xl"></div>
      
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-32 w-96 h-96 bg-blue-400/20 rounded-full blur-2xl animate-float-delayed"></div>
        <div className="absolute bottom-32 left-1/4 w-80 h-80 bg-purple-400/15 rounded-full blur-xl animate-float-slow"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-pink-400/20 rounded-full blur-xl animate-float-delayed"></div>
      </div>

      <div className="relative min-h-screen text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <header className="flex flex-wrap items-center justify-between gap-4 pb-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 text-sm font-medium text-white/90 shadow-lg transition-all hover:bg-white/20 hover:border-white/30">
                <span className="text-2xl animate-bounce">🦆</span>
                Honk Workspace
              </div>
              <h1 className="text-5xl sm:text-7xl font-bold leading-tight text-white max-w-4xl">
                Your <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">whimsical</span> messaging workspace.
              </h1>
              <p className="text-xl text-white/80 max-w-2xl leading-relaxed">
                Send postcards, track weather patterns, and watch your messages journey across the globe with duck couriers.
              </p>
              <div className="relative w-full max-w-xl mt-8">
                <div className="w-[300px] h-[300px] relative flex items-center justify-center bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
                  <video
                    key="duck-video"
                    className="w-full h-full rounded-3xl"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    style={{
                      transform: 'scale(1.2)',
                    }}
                  >
                    <source src="/duck-moving.webm" type="video/webm" />
                  </video>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-white/70 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                    Welcome back, <span className="font-medium text-white">{user.username}</span>
                  </span>
                  <Link href="/profile">
                    <Button variant="outline" size="sm" className="border-white/30 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 hover:border-white/40">
                      Profile
                    </Button>
                  </Link>
                  <Button onClick={logout} variant="outline" size="sm" className="border-white/30 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 hover:border-white/40">
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/postcard">
                    <Button variant="ghost" size="lg" className="text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-md rounded-full px-6">
                      Launch postcard studio
                    </Button>
                  </Link>
                  <span className="text-sm text-white/70 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                    No login needed—your courier ID is created automatically.
                  </span>
                </>
              )}
            </div>
          </header>

          <style jsx global>{`
            @keyframes gradient-shift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px) translateX(0px); }
              33% { transform: translateY(-20px) translateX(10px); }
              66% { transform: translateY(10px) translateX(-10px); }
            }
            @keyframes float-delayed {
              0%, 100% { transform: translateY(0px) translateX(0px); }
              33% { transform: translateY(15px) translateX(-15px); }
              66% { transform: translateY(-10px) translateX(15px); }
            }
            @keyframes float-slow {
              0%, 100% { transform: translateY(0px) translateX(0px); }
              50% { transform: translateY(-15px) translateX(5px); }
            }
            .animate-gradient-shift {
              background-size: 400% 400%;
              animation: gradient-shift 8s ease infinite;
            }
            .animate-float {
              animation: float 6s ease-in-out infinite;
            }
            .animate-float-delayed {
              animation: float-delayed 8s ease-in-out infinite;
            }
            .animate-float-slow {
              animation: float-slow 10s ease-in-out infinite;
            }
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>

          <main className="mt-16 space-y-20">
            {user ? (
              <>
                <section className="grid gap-8 lg:grid-cols-[3fr,2fr]">
                  <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-10 shadow-2xl hover:bg-white/15 transition-all duration-500">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                        <span className="text-3xl">👋</span>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-yellow-300 font-semibold">Today</p>
                        <h2 className="text-4xl font-bold text-white">Welcome back, {user.username}</h2>
                      </div>
                    </div>
                    <p className="mt-8 max-w-2xl text-xl text-white/80 leading-relaxed">
                      Ready to send some joy across the skies? Your duck couriers await your next adventure.
                    </p>
                    <div className="mt-10 grid gap-6 sm:grid-cols-2">
                      {quickActions.map(action => (
                        <Link
                          key={action.href}
                          href={action.href}
                          className="group flex h-full flex-col justify-between rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-8 py-6 shadow-xl transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:shadow-2xl hover:scale-[1.02]"
                        >
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <span className="text-3xl">{action.icon}</span>
                              <p className="text-lg font-semibold text-white">{action.title}</p>
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed">{action.description}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-6">
                            <span className="text-sm font-medium text-yellow-300 group-hover:text-yellow-200">Get started</span>
                            <span className="transform transition-transform group-hover:translate-x-1 text-yellow-300">&rarr;</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-8 shadow-2xl">
                      <h3 className="text-lg font-semibold text-white">Your aviator snapshot</h3>
                      <dl className="mt-8 space-y-6 text-sm text-white/80">
                        <div className="flex items-baseline justify-between">
                          <dt className="uppercase tracking-wide text-xs text-white/60">Current rank</dt>
                          <dd className="text-xl font-semibold text-yellow-300">{user.current_rank}</dd>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <dt className="uppercase tracking-wide text-xs text-white/60">Journey points</dt>
                          <dd className="text-xl font-semibold text-yellow-300">{user.total_journey_points.toLocaleString()}</dd>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <dt className="uppercase tracking-wide text-xs text-white/60">Location sharing</dt>
                          <dd className="text-sm text-white/80">
                            {user.location_sharing_preference === 'anonymous'
                              ? 'Anonymous'
                              : user.location_sharing_preference === 'country'
                                ? 'Country only'
                                : 'State or province'}
                          </dd>
                        </div>
                      </dl>
                      <Link
                        href="/profile"
                        className="mt-8 inline-flex items-center text-sm font-medium text-yellow-300 hover:text-yellow-200 transition-colors"
                      >
                        Update profile settings &rarr;
                      </Link>
                    </div>
                    <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 border-dashed p-8 shadow-xl">
                      <h3 className="text-lg font-semibold text-white">Workspace highlights</h3>
                      <div className="mt-6 space-y-4 text-sm text-white/80">
                        {workspaceShortcuts.map(shortcut => (
                          <Link
                            key={shortcut.href}
                            href={shortcut.href}
                            className="group flex items-center justify-between rounded-xl px-4 py-3 transition-all hover:bg-white/10 hover:backdrop-blur-sm"
                          >
                            <div>
                              <p className="font-medium text-white">{shortcut.title}</p>
                              <p className="text-xs text-white/60">{shortcut.description}</p>
                            </div>
                            <span className="text-white/40 group-hover:text-white/80 transition-colors">&nearr;</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
                <section className="grid gap-8 md:grid-cols-2">
                  {publicFeatures.map((feature, index) => (
                    <div 
                      key={feature.title} 
                      className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-8 shadow-2xl hover:bg-white/15 hover:shadow-3xl transition-all duration-500"
                      style={{
                        animationDelay: `${index * 150}ms`,
                        animation: 'fadeInUp 0.8s ease-out forwards',
                      }}
                    >
                      <h3 className="text-2xl font-semibold text-white">{feature.title}</h3>
                      <p className="mt-4 text-base text-white/80 leading-relaxed">{feature.description}</p>
                    </div>
                  ))}
                </section>
              </>
            ) : (
              <>
                <section className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-16 shadow-2xl">
                  <div className="space-y-8">
                    <p className="text-xs uppercase tracking-[0.3em] text-yellow-300 font-semibold">Honk workspace</p>
                    <h2 className="text-6xl font-bold leading-tight text-white">
                      A calm, <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">Notion-inspired</span> canvas for whimsical postcards.
                    </h2>
                    <p className="max-w-4xl text-xl text-white/80 leading-relaxed">
                      Draft six-line postcards, drop in stickers, and follow duck couriers as they glide through weather systems across the globe. Everything feels structured, minimal, and delightfully analog.
                    </p>
                    <div className="flex flex-wrap items-center gap-6 pt-4">
                      <Link href="/postcard">
                        <Button size="lg" className="rounded-full px-8 py-4 text-lg bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border border-white/30 shadow-lg">
                          Start crafting now
                        </Button>
                      </Link>
                      <Link href="/demo">
                        <Button variant="ghost" size="lg" className="rounded-full px-8 py-4 text-lg text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-md">
                          Watch the demo
                        </Button>
                      </Link>
                    </div>
                    <p className="text-base text-white/70 pt-2">
                      Every visitor gets a personal courier ID automatically—jump in and send your first honk in seconds.
                    </p>
                  </div>
                </section>
                <section className="grid gap-8 md:grid-cols-2">
                  {publicFeatures.map((feature, index) => (
                    <div 
                      key={feature.title} 
                      className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-10 shadow-2xl hover:bg-white/15 hover:shadow-3xl transition-all duration-500"
                      style={{
                        animationDelay: `${index * 150}ms`,
                        animation: 'fadeInUp 0.8s ease-out forwards',
                      }}
                    >
                      <div className="flex items-start gap-6">
                        <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                          <span className="text-2xl">{
                            index === 0 ? '📝' :
                            index === 1 ? '✨' :
                            index === 2 ? '🌤️' :
                            '💌'
                          }</span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-semibold text-white">{feature.title}</h3>
                          <p className="mt-4 text-lg text-white/80 leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </section>
                <section className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-12 shadow-2xl">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-white">How it works</h3>
                  </div>
                  <ol className="mt-8 space-y-10 relative">
                    <div className="absolute left-[35px] top-0 bottom-0 w-px bg-gradient-to-b from-white/30 to-transparent"></div>
                    <li className="flex gap-8 group">
                      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-xl font-bold text-white border border-white/30 transition-all duration-300 group-hover:bg-white/30 group-hover:border-white/40">1</span>
                      <div className="pt-3">
                        <p className="text-2xl font-semibold text-white mb-3">Write a six-line postcard</p>
                        <p className="text-lg text-white/80 leading-relaxed">Use the postcard composer to craft a focused message and decorate it with draggable stickers for that perfect personal touch.</p>
                      </div>
                    </li>
                    <li className="flex gap-8 group">
                      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-xl font-bold text-white border border-white/30 transition-all duration-300 group-hover:bg-white/30 group-hover:border-white/40">2</span>
                      <div className="pt-3">
                        <p className="text-2xl font-semibold text-white mb-3">Let the ducks deliver</p>
                        <p className="text-lg text-white/80 leading-relaxed">Our intelligent routing algorithm pairs you with the perfect recipient and charts a weather-aware flight path for your message.</p>
                      </div>
                    </li>
                    <li className="flex gap-8 group">
                      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-xl font-bold text-white border border-white/30 transition-all duration-300 group-hover:bg-white/30 group-hover:border-white/40">3</span>
                      <div className="pt-3">
                        <p className="text-2xl font-semibold text-white mb-3">Track and collect</p>
                        <p className="text-lg text-white/80 leading-relaxed">Follow your message's journey in real-time through the flight visualizer and build your collection of cherished postcards.</p>
                      </div>
                    </li>
                  </ol>
                </section>
                <section className="rounded-3xl bg-white/5 backdrop-blur-md border-2 border-dashed border-white/20 p-10 shadow-xl">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <span className="text-xl">🧪</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white">Explore the Lab</h3>
                  </div>
                  <div className="mt-6 grid gap-6 md:grid-cols-3">
                    {labLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="group rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-6 py-5 text-sm text-white/80 transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:shadow-2xl hover:scale-[1.02]"
                      >
                        <div className="font-semibold text-white text-lg mb-3">{link.label}</div>
                        <p className="text-sm text-white/70 group-hover:text-white/90 leading-relaxed">{link.description}</p>
                        <div className="mt-4 flex items-center gap-2 text-yellow-300 opacity-0 transform translate-x-[-10px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                          <span className="text-sm font-medium">Try it out</span>
                          <span>→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}