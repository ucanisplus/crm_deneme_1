"use client";

import React, { useState } from 'react';
import { Search, FileText, Package, Users, DollarSign, BarChart } from 'lucide-react';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import Link from 'next/link';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  link: string;
  icon: React.ReactNode;
}

const mockResults: SearchResult[] = [
  {
    id: '1',
    title: 'Maliyet Hesaplama',
    description: 'Üretim maliyetlerini hesapla ve analiz et',
    category: 'Üretim',
    link: '/uretim/hesaplamalar/maliyet',
    icon: <DollarSign size={20} />
  },
  {
    id: '2',
    title: 'Galvaniz Talebi',
    description: 'Yeni galvaniz talebi oluştur',
    category: 'Satış',
    link: '/satis/galvaniz-talebi',
    icon: <Package size={20} />
  },
  {
    id: '3',
    title: 'Müşteriler',
    description: 'Müşteri listesi ve yönetimi',
    category: 'CRM',
    link: '/under-construction',
    icon: <Users size={20} />
  },
  {
    id: '4',
    title: 'Performans Metrikleri',
    description: 'Üretim performansını görüntüle',
    category: 'Üretim',
    link: '/uretim/hesaplamalar/performans',
    icon: <BarChart size={20} />
  }
];

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setFilteredResults([]);
      return;
    }

    const filtered = mockResults.filter(result => 
      result.title.toLowerCase().includes(term.toLowerCase()) ||
      result.description.toLowerCase().includes(term.toLowerCase()) ||
      result.category.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredResults(filtered);
  };

  return (
    <ClientAuthCheck>
      <MainLayout3>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Arama</h1>
          
          <div className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 text-base"
              placeholder="Modül, sayfa veya özellik ara..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>

          {searchTerm && (
            <div className="mb-4 text-sm text-gray-600">
              {filteredResults.length} sonuç bulundu
            </div>
          )}

          <div className="space-y-4">
            {filteredResults.map((result) => (
              <Link
                key={result.id}
                href={result.link}
                className="block bg-white p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 p-2 bg-red-50 rounded-lg text-red-600">
                    {result.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {result.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {result.description}
                    </p>
                    <span className="inline-block px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
                      {result.category}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {searchTerm && filteredResults.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sonuç bulunamadı
              </h3>
              <p className="text-gray-500">
                "{searchTerm}" için sonuç bulunamadı. Farklı terimlerle tekrar deneyin.
              </p>
            </div>
          )}

          {!searchTerm && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Hızlı Erişim
              </h3>
              <p className="text-gray-500 mb-6">
                Sık kullanılan sayfalar
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <Link
                  href="/uretim/hesaplamalar/maliyet"
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:border-red-300 hover:shadow-sm transition-all text-center"
                >
                  <DollarSign className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-900">Maliyet Hesaplama</span>
                </Link>
                <Link
                  href="/satis/galvaniz-talebi"
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:border-red-300 hover:shadow-sm transition-all text-center"
                >
                  <Package className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-900">Galvaniz Talebi</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}