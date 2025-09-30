"use client";

import { checkEnvs } from "@/lib/actions";
import React from 'react';

// Lightweight local fallback for SetupToolbar to avoid requiring @joycostudio/v0-setup
const SetupToolbarFallback = ({ title, description, envCheckAction }: { title: string; description: string; envCheckAction?: () => Promise<any>; }) => {
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  const runCheck = async () => {
    setRunning(true);
    try {
      if (envCheckAction) {
        await envCheckAction();
        setResult('All checks passed');
      } else {
        setResult('No checks configured');
      }
    } catch (err) {
      setResult('Checks failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ padding: 12, border: '1px dashed #ccc', borderRadius: 8 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ marginTop: 6 }}>{description}</p>
      <div style={{ marginTop: 8 }}>
        <button onClick={runCheck} disabled={running} style={{ padding: '6px 10px' }}>
          {running ? 'Running...' : 'Run env checks'}
        </button>
        {result && <div style={{ marginTop: 8 }}>{result}</div>}
      </div>
    </div>
  );
};

export const V0Setup = () => {
  return (
    <SetupToolbarFallback
      title="V0 Newsletter Setup"
      description="Setup your V0 Newsletter"
      envCheckAction={checkEnvs}
    />
  );
};

export default V0Setup;
