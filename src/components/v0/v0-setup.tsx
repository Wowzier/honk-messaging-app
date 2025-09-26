"use client";

import { checkEnvs } from "@/lib/actions";

// Placeholder component for V0 Setup
export const SetupToolbar = ({ title, description, envCheckAction }: {
  title: string;
  description: string;
  envCheckAction: () => Promise<any>;
}) => {
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg">
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm">{description}</p>
      <button
        onClick={() => envCheckAction()}
        className="mt-2 px-3 py-1 bg-blue-600 rounded text-sm"
      >
        Check Environment
      </button>
    </div>
  );
};

export const V0Setup = () => {
  return (
    <SetupToolbar
      title="V0 Newsletter Setup"
      description="Setup your V0 Newsletter"
      envCheckAction={checkEnvs}
    />
  );
};

export default V0Setup;

