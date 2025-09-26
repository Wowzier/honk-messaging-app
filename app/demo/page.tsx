'use client';

import React from 'react';
import { DemoMessagingFlow } from '@/components/messaging/DemoMessagingFlow';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto py-8">
        <DemoMessagingFlow />
      </div>
    </div>
  );
}