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
    <div className="min-h-screen bg-gradient-to-br from-[#f8f7f4] to-[#eef1f5] text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
              <span className="text-xl animate-bounce">🦆</span>
              Honk Workspace
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-slate-900 max-w-2xl">
              Your <span className="text-blue-600">whimsical</span> messaging workspace.
            </h1>
            <p className="text-lg text-slate-600 max-w-xl">
              Send postcards, track weather patterns, and watch your messages journey across the globe with duck couriers.
            </p>
            <div className="relative w-full max-w-xl mt-6">
              <div className="w-[300px] h-[300px] relative flex items-center justify-center">
                <video
                  key="duck-video"
                  className="w-full h-full"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  style={{
                    mixBlendMode: 'screen',
                    transform: 'scale(1.5)', // Adjust scale as needed
                  }}
                >
                  <source src="/duck-moving.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-slate-500">
                  Signed in as <span className="font-medium text-slate-700">{user.username}</span>
                </span>
                <Link href="/profile">
                  <Button variant="outline" size="sm" className="border-slate-300 text-slate-700">
                    Profile
                  </Button>
                </Link>
                <Button onClick={logout} variant="outline" size="sm" className="border-slate-300 text-slate-700">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                    Create account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </header>

        <main className="mt-12 space-y-16">
          {user ? (
            <>
              <section className="grid gap-8 lg:grid-cols-[3fr,2fr]">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-lg backdrop-blur hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-2xl">👋</span>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-blue-600 font-semibold">Today</p>
                      <h2 className="text-3xl font-bold text-slate-900">Welcome back, {user.username}</h2>
                    </div>
                  </div>
                  <p className="mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
                    Ready to send some joy across the skies? Your duck couriers await your next adventure.
                  </p>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {quickActions.map(action => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white/80 px-6 py-5 shadow-sm transition-all duration-300 hover:border-blue-200 hover:bg-white hover:shadow-lg hover:scale-[1.02]"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{action.icon}</span>
                            <p className="text-base font-semibold text-slate-800">{action.title}</p>
                          </div>
                          <p className="text-sm text-slate-500 leading-relaxed">{action.description}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">Get started</span>
                          <span className="transform transition-transform group-hover:translate-x-1">&rarr;</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700">Your aviator snapshot</h3>
                    <dl className="mt-6 space-y-4 text-sm text-slate-600">
                      <div className="flex items-baseline justify-between">
                        <dt className="uppercase tracking-wide text-xs text-slate-400">Current rank</dt>
                        <dd className="text-lg font-semibold text-slate-900">{user.current_rank}</dd>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <dt className="uppercase tracking-wide text-xs text-slate-400">Journey points</dt>
                        <dd className="text-lg font-semibold text-slate-900">{user.total_journey_points.toLocaleString()}</dd>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <dt className="uppercase tracking-wide text-xs text-slate-400">Location sharing</dt>
                        <dd className="text-sm text-slate-600">
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
                      className="mt-6 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                      Update profile settings &rarr;
                    </Link>
                  </div>
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 shadow-inner">
                    <h3 className="text-sm font-semibold text-slate-700">Workspace highlights</h3>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      {workspaceShortcuts.map(shortcut => (
                        <Link
                          key={shortcut.href}
                          href={shortcut.href}
                          className="group flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-slate-100"
                        >
                          <div>
                            <p className="font-medium text-slate-800">{shortcut.title}</p>
                            <p className="text-xs text-slate-500">{shortcut.description}</p>
                          </div>
                          <span className="text-slate-400 group-hover:text-slate-600">&nearr;</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
              <section className="grid gap-6 md:grid-cols-2">
                {publicFeatures.map(feature => (
                  <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                    <p className="mt-3 text-sm text-slate-600">{feature.description}</p>
                  </div>
                ))}
              </section>
            </>
          ) : (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white/80 p-12 shadow-sm backdrop-blur">
                <div className="space-y-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Honk workspace</p>
                  <h2 className="text-5xl font-semibold leading-tight text-slate-900">
                    A calm, Notion-inspired canvas for whimsical postcards.
                  </h2>
                  <p className="max-w-3xl text-lg text-slate-600">
                    Draft six-line postcards, drop in stickers, and follow duck couriers as they glide through weather systems across the globe. Everything feels structured, minimal, and delightfully analog.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href="/register">
                      <Button size="lg" className="rounded-full px-6">
                        Create your account
                      </Button>
                    </Link>
                    <Link href="/demo">
                      <Button variant="ghost" size="lg" className="rounded-full text-slate-600 hover:text-slate-900">
                        Watch the demo
                      </Button>
                    </Link>
                  </div>
                  <p className="text-sm text-slate-500">
                    Already using Honk?{' '}
                    <Link href="/login" className="font-medium text-slate-700 hover:text-slate-900">
                      Sign in here
                    </Link>
                  </p>
                </div>
              </section>
              <section className="grid gap-6 md:grid-cols-2">
                {publicFeatures.map((feature, index) => (
                  <div 
                    key={feature.title} 
                    className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-md hover:shadow-xl transition-all duration-300"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: 'fadeInUp 0.6s ease-out forwards',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xl">{
                          index === 0 ? '📝' :
                          index === 1 ? '✨' :
                          index === 2 ? '🌤️' :
                          '💌'
                        }</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                        <p className="mt-3 text-base text-slate-600 leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
              <style jsx global>{`
                @keyframes fadeInUp {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
              <section className="rounded-2xl border border-slate-200 bg-white/90 p-10 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xl">🎯</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">How it works</h3>
                </div>
                <ol className="mt-6 space-y-8 relative">
                  <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-100 to-transparent"></div>
                  <li className="flex gap-6 group">
                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-600 ring-8 ring-white/90 transition-all duration-300 group-hover:bg-blue-100 group-hover:ring-4">1</span>
                    <div className="pt-2">
                      <p className="text-xl font-semibold text-slate-900 mb-2">Write a six-line postcard</p>
                      <p className="text-base text-slate-600 leading-relaxed">Use the postcard composer to craft a focused message and decorate it with draggable stickers for that perfect personal touch.</p>
                    </div>
                  </li>
                  <li className="flex gap-6 group">
                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-600 ring-8 ring-white/90 transition-all duration-300 group-hover:bg-blue-100 group-hover:ring-4">2</span>
                    <div className="pt-2">
                      <p className="text-xl font-semibold text-slate-900 mb-2">Let the ducks deliver</p>
                      <p className="text-base text-slate-600 leading-relaxed">Our intelligent routing algorithm pairs you with the perfect recipient and charts a weather-aware flight path for your message.</p>
                    </div>
                  </li>
                  <li className="flex gap-6 group">
                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-600 ring-8 ring-white/90 transition-all duration-300 group-hover:bg-blue-100 group-hover:ring-4">3</span>
                    <div className="pt-2">
                      <p className="text-xl font-semibold text-slate-900 mb-2">Track and collect</p>
                      <p className="text-base text-slate-600 leading-relaxed">Follow your message's journey in real-time through the flight visualizer and build your collection of cherished postcards.</p>
                    </div>
                  </li>
                </ol>
              </section>
              <section className="rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-white/80 to-blue-50/50 p-8 shadow-inner backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-lg">🧪</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Explore the Lab</h3>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {labLinks.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group rounded-xl border border-slate-200 bg-white/90 px-5 py-4 text-sm text-slate-600 transition-all duration-300 hover:border-blue-200 hover:bg-white hover:text-slate-900 hover:shadow-lg hover:scale-[1.02]"
                    >
                      <div className="font-semibold text-slate-800 text-base mb-2">{link.label}</div>
                      <p className="text-sm text-slate-500 group-hover:text-slate-600 leading-relaxed">{link.description}</p>
                      <div className="mt-3 flex items-center gap-2 text-blue-600 opacity-0 transform translate-x-[-10px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
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
  );
}