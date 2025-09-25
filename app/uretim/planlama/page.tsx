'use client';

import React, { useState, useEffect } from 'react';
import MainLayout3 from '@/components/MainLayout3';
import ProtectedRoute from '@/components/ProtectedRoute';
import CelikHasirPlanlama from '@/components/CelikHasirPlanlama';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Settings,
  BarChart3,
  Factory,
  Users,
  Target,
  TrendingUp,
  Package,
  Truck,
  Search,
  Filter,
  Plus,
  Upload,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Zap,
  PieChart,
  ArrowRight,
  ChevronDown,
  MousePointer2,
  Move,
  Activity,
  Layers,
  GitBranch,
  Database,
  Gauge,
  Flame,
  Wrench,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';

// The original comprehensive APS system as a component
function ComprehensiveAPSSystem() {
  // This will be imported from the original backup file later
  // For now, just a placeholder
  return (
    <div className="p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Kapsamlı APS Sistemi</h3>
        <p className="text-gray-600">
          Tüm ürün hatları için genel planlama sistemi (Panel Çit, Çivi, Tavlı Tel, Profil)
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Orijinal komprehensif planlama sistemi buraya entegre edilecek
        </p>
      </div>
    </div>
  );
}

export default function APSSystemPage() {
  return (
    <ProtectedRoute>
      <MainLayout3>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">İleri Planlama & Çizelgeleme (APS)</h1>
            <p className="text-gray-600">Akıllı üretim planlama ve çizelgeleme sistemi</p>
          </div>

          {/* Product Planning Tabs */}
          <Tabs defaultValue="celik-hasir" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="celik-hasir">Çelik Hasır</TabsTrigger>
              <TabsTrigger value="genel">Genel APS</TabsTrigger>
              <TabsTrigger value="panel-cit" disabled>Panel Çit</TabsTrigger>
              <TabsTrigger value="civi" disabled>Çivi</TabsTrigger>
              <TabsTrigger value="diger" disabled>Diğer</TabsTrigger>
            </TabsList>

            {/* Çelik Hasır Tab - Your new production planning */}
            <TabsContent value="celik-hasir" className="mt-6">
              <div className="bg-white rounded-lg shadow">
                <CelikHasirPlanlama />
              </div>
            </TabsContent>

            {/* Genel APS Tab - Original comprehensive system */}
            <TabsContent value="genel" className="mt-6">
              <div className="bg-white rounded-lg shadow">
                <ComprehensiveAPSSystem />
              </div>
            </TabsContent>

            {/* Future tabs */}
            <TabsContent value="panel-cit" className="mt-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center text-gray-500">
                  <h3 className="text-lg font-semibold mb-2">Panel Çit Planlaması</h3>
                  <p>Yakında kullanıma sunulacak</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="civi" className="mt-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center text-gray-500">
                  <h3 className="text-lg font-semibold mb-2">Çivi Planlaması</h3>
                  <p>Yakında kullanıma sunulacak</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="diger" className="mt-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center text-gray-500">
                  <h3 className="text-lg font-semibold mb-2">Diğer Ürünler</h3>
                  <p>Tavlı Tel, Profil ve diğer ürünler için planlama</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout3>
    </ProtectedRoute>
  );
}