"use client";

import { useState, Suspense } from "react";
import { UserForm } from "@/components/user-form";

// Loading fallback component
function FormSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-12 bg-gray-200 rounded mb-4"></div>
      <div className="h-32 bg-gray-200 rounded mb-4"></div>
      <div className="h-12 bg-gray-200 rounded"></div>
    </div>
  );
}

export default function Home() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 text-center border-b">
            <h1 className="text-2xl font-bold text-gray-800">
              Create Your Digital Twin
            </h1>
          </div>
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
                {error}
              </div>
            )}
            <Suspense fallback={<FormSkeleton />}>
              <UserForm onError={setError} />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
