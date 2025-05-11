"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PerformansPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/under-construction');
  }, [router]);

  return null;
}