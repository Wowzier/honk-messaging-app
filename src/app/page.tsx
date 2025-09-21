'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user, loading, logout } = useAuth();

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
      description: 'See how weather shifts each courier’s journey.',
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
    <div className="min-h-screen bg-[#f8f7f4] text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
              <span className="text-base">🦆</span>
              Honk workspace
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900">
              Messages, weather, and postcards arranged like your favorite Notion doc.
            </h1>
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
                <div className="rounded-3xl border border-slate-200 bg-white/80 p-10 shadow-sm backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Today</p>
                  <h2 className="mt-3 text-4xl font-semibold text-slate-900">Welcome back, {user.username}</h2>
                  <p className="mt-4 max-w-2xl text-base text-slate-600">
                    Pick up where you left off: compose a postcard, check recent deliveries, or follow ducks gliding through new weather systems.
                  </p>
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {quickActions.map(action => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-slate-400 hover:shadow-md"
                      >
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-800">{action.icon} {action.title}</p>
                          <p className="text-xs text-slate-500">{action.description}</p>
                        </div>
                        <span className="self-end text-sm text-slate-400 transition group-hover:text-slate-600">→</span>
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
                      Update profile settings →
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
                          <span className="text-slate-400 group-hover:text-slate-600">↗</span>
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
                {publicFeatures.map(feature => (
                  <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                    <p className="mt-3 text-sm text-slate-600">{feature.description}</p>
                  </div>
                ))}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-700">How it works</h3>
                <ol className="mt-6 space-y-4 text-sm text-slate-600">
                  <li className="flex gap-3">
                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">1</span>
                    <div>
                      <p className="font-medium text-slate-900">Write a six-line postcard</p>
                      <p>Use the postcard composer to craft a focused message and decorate it with draggable stickers.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">2</span>
                    <div>
                      <p className="font-medium text-slate-900">Let the ducks deliver</p>
                      <p>Our routing algorithm pairs you with a recipient and charts a weather-aware flight path.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">3</span>
                    <div>
                      <p className="font-medium text-slate-900">Track and collect</p>
                      <p>Watch the journey in the flight visualizer and save favorite postcards in your personal collections.</p>
                    </div>
                  </li>
                </ol>
              </section>
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 shadow-inner">
                <h3 className="text-sm font-semibold text-slate-700">Explore the lab</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {labLinks.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-900 hover:shadow-sm"
                    >
                      <div className="font-medium text-slate-800">{link.label}</div>
                      <p className="mt-1 text-xs text-slate-500 group-hover:text-slate-600">{link.description}</p>
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
