import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR
const HesaplamalarPageRestricted = dynamic(
  () => import('@/pages/HesaplamalarPageRestricted'),
  { ssr: false }
);

export default function UrunHesaplamalariPage() {
  return <HesaplamalarPageRestricted />;
}