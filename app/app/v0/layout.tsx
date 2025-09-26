"use client";

import type React from "react";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import { V0Provider } from "@/lib/context";
import dynamic from "next/dynamic";

const V0Setup = dynamic(() => import("@/components/v0-setup"));

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export default function V0Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(geistSans.variable, geistMono.variable, instrumentSerif.variable)}>
        <V0Provider isV0={false}>
          {children}
          <V0Setup />
        </V0Provider>
      </body>
    </html>
  );
}
