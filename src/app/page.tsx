'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const { user, loading, logout } = useAuth();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-bold text-gray-900">🦆 Honk!</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-700">Welcome, {user.username}!</span>
                <Link href="/profile">
                  <Button variant="outline">Profile</Button>
                </Link>
                <Button onClick={logout} variant="outline">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link href="/register">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          {user ? (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Ready to send a Honk? 🚀
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Your duck couriers are standing by to deliver messages across the world!
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>📝 Compose Message</CardTitle>
                    <CardDescription>
                      Write a new Honk and send it to someone around the world
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/compose">
                      <Button className="w-full">
                        Compose Honk 🚀
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>📬 Your Inbox</CardTitle>
                    <CardDescription>
                      Check messages that have been delivered to you
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/inbox">
                      <Button className="w-full" variant="outline">
                        View Inbox 📨
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>💬 Conversations</CardTitle>
                    <CardDescription>
                      View your message threads and reply to conversations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/conversations">
                      <Button className="w-full" variant="outline">
                        View Conversations 🗨️
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>🛩️ Flight Tracker</CardTitle>
                    <CardDescription>
                      Watch your duck couriers fly messages in real-time with weather effects
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/weather-demo">
                      <Button className="w-full">
                        🌤️ Weather Demo - Track Flights
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>📖 Scrapbook</CardTitle>
                    <CardDescription>
                      Browse your message history and journey memories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline" disabled>
                      Coming Soon - View Scrapbook
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900">🏆 Your Aviator Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-600">Current Rank</p>
                      <p className="text-lg font-semibold text-blue-900">{user.current_rank}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Journey Points</p>
                      <p className="text-lg font-semibold text-blue-900">
                        {user.total_journey_points.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center space-y-8">
              <div>
                <h2 className="text-5xl font-bold text-gray-900 mb-4">
                  Welcome to Honk! 🦆
                </h2>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Send messages across the world with duck couriers! Watch your messages fly in real-time, 
                  affected by weather and terrain, creating a unique and whimsical messaging experience.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>🌍 Global Delivery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Send messages to random users around the world and discover new places
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>🛩️ Real-time Flight</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Watch your duck couriers navigate weather and terrain in real-time
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>🏆 Aviator Ranks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Earn journey points and advance through aviator ranks as you send messages
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Link href="/register">
                  <Button size="lg" className="text-lg px-8 py-3">
                    Join the Duck Courier Network! 🚀
                  </Button>
                </Link>
                <div className="flex gap-4 justify-center">
                  <Link href="/demo">
                    <Button variant="outline" size="lg">
                      🦆 Full Demo
                    </Button>
                  </Link>
                  <Link href="/weather-demo">
                    <Button variant="outline" size="lg">
                      🌤️ Weather Demo
                    </Button>
                  </Link>
                  <Link href="/weather-search">
                    <Button variant="outline" size="lg">
                      🌍 Weather Search
                    </Button>
                  </Link>
                </div>
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
