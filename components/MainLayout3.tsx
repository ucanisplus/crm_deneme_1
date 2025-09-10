"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Home, 
  Settings, 
  Users, 
  BarChart2, 
  Briefcase, 
  Activity, 
  PieChart, 
  Search, 
  Bell, 
  LogOut, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  Wrench,
  Database,
  FileText,
  Target,
  DollarSign,
  MessageSquare,
  Shuffle,
  Grid,
  List,
  Layers,
  Truck,
  BarChart,
  Package,
  Link as LinkIcon,
  Link2,
  Hammer,
  Cpu,
  User,
  ShoppingCart,
  PlusCircle
} from 'lucide-react';

// Interface definitions unchanged...
interface SubItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  path: string;
  hasSubItems?: boolean;
}

interface SubCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  path: string;
  hasSubItems?: boolean;
  subItems?: SubItem[];
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  path: string;
  hasSubCategories: boolean;
  subCategories?: SubCategory[];
}

const MainLayout3: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, profilePicture, hasPermission } = useAuth();
  
  // Memoize permission checks to prevent loops in navigation rendering
  const canAccessMaliyetHesaplama = useMemo(() => 
    hasPermission('page:maliyet-hesaplama'),
    [hasPermission]
  );
  
  // Navigation states
  const [navExpanded, setNavExpanded] = useState(false);
  const [activeMainCategory, setActiveMainCategory] = useState<string | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [expandedSubCategories, setExpandedSubCategories] = useState<Record<string, boolean>>({});
  const [showPermissionWarning, setShowPermissionWarning] = useState(false);
  
  // Route tracking
  const [activeItem, setActiveItem] = useState<string | null>(null);
  
  useEffect(() => {
    // URL-based active menu item determination
    const path = pathname || '';
    
    if (path.includes('/uretim')) {
      setActiveMainCategory('uretim');
      
      if (path.includes('/dashboard')) {
        setActiveSubCategory('dashboard');
      } else if (path.includes('/uretim-verileri')) {
        setActiveSubCategory('uretim-verileri');
        setExpandedSubCategories(prev => ({ ...prev, 'uretim-verileri': true }));
      } else if (path.includes('/hesaplamalar')) {
        setActiveSubCategory('hesaplamalar');
        setExpandedSubCategories(prev => ({ ...prev, 'hesaplamalar': true }));
        
        if (path.includes('/hesaplamalar/maliyet')) {
          setActiveItem('maliyet');
        } else if (path.includes('/hesaplamalar/urun')) {
          setActiveItem('urun');
        }
      }
    } else if (path.includes('/satis')) {
      setActiveMainCategory('satis');
      
      if (path.includes('/galvaniz-talebi')) {
        setActiveSubCategory('galvaniz-talebi');
      }
    } else if (path.includes('/crm')) {
      setActiveMainCategory('crm');
      
      if (path.includes('/lead-kanban')) {
        setActiveSubCategory('lead-kanban');
      } else if (path.includes('/musteriler')) {
        setActiveSubCategory('musteriler');
      }
    } else if (path.includes('/diger')) {
      setActiveMainCategory('diger');
    }
  }, [pathname]);

  // Toggle navigation
  const toggleNav = () => {
    setNavExpanded(!navExpanded);
  };

  // Main category selection
  const selectMainCategory = (category: string) => {
    if (activeMainCategory === category) {
      setActiveMainCategory(null);
      setActiveSubCategory(null);
    } else {
      setActiveMainCategory(category);
      setActiveSubCategory(null);
    }
  };

  // Sub category selection
  const selectSubCategory = (category: string) => {
    setActiveSubCategory(category);
  };

  // Toggle sub category (expand/collapse)
  const toggleSubCategory = (subCategoryId: string) => {
    setExpandedSubCategories(prev => ({
      ...prev,
      [subCategoryId]: !prev[subCategoryId]
    }));
  };

  // Back to main
  const backToMain = () => {
    router.push('/');
    setActiveMainCategory(null);
    setActiveSubCategory(null);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // Main navigation categories
  const mainCategories: Category[] = [
    // Categories remain unchanged...
    { 
      id: 'uretim', 
      name: 'Üretim', 
      icon: <Wrench size={20} />, 
      path: '/uretim',
      hasSubCategories: true,
      subCategories: [
        { id: 'dashboard', name: 'Dashboard', icon: <BarChart size={18} />, path: '/under-construction', hasSubItems: false },
        { 
          id: 'uretim-verileri', 
          name: 'Üretim Verileri', 
          icon: <Database size={18} />,
          path: '/uretim/uretim-verileri',
          hasSubItems: true,
          subItems: [
            { id: 'panel-cit', name: 'Panel Çit', icon: <Grid size={14} />, path: '/under-construction' },
            { id: 'galvanizli-tel', name: 'Galvanizli Tel', icon: <LinkIcon size={14} />, path: '/under-construction' },
            { id: 'celik-hasir', name: 'Çelik Hasır', icon: <Grid size={14} />, path: '/under-construction' },
            { id: 'tavli-tel', name: 'Tavlı Tel', icon: <Link2 size={14} />, path: '/under-construction' },
            { id: 'civi', name: 'Çivi', icon: <Hammer size={14} />, path: '/under-construction' },
            { id: 'zirhli-tel', name: 'Zırhlı Tel', icon: <LinkIcon size={14} />, path: '/under-construction' },
          ] 
        },
        { 
          id: 'hesaplamalar', 
          name: 'Hesaplamalar', 
          icon: <Activity size={18} />,
          path: '/uretim/hesaplamalar',
          hasSubItems: true,
          subItems: [
            { id: 'urun', name: 'Ürün Hesaplamaları', icon: <Package size={14} />, path: '/uretim/hesaplamalar/urun', hasSubItems: false },
            { id: 'maliyet', name: 'Maliyet Hesaplama', icon: <DollarSign size={14} />, path: '/uretim/hesaplamalar/maliyet', hasSubItems: false },
            { id: 'kapasite', name: 'Kapasite Analizi', icon: <BarChart size={14} />, path: '/uretim/hesaplamalar/kapasite' },
            { id: 'planlama', name: 'Üretim Planlama', icon: <FileText size={14} />, path: '/uretim/planlama' },
            { id: 'performans', name: 'Performans Metrikleri', icon: <Activity size={14} />, path: '/uretim/hesaplamalar/performans' },
          ]
        },
      ]
    },
    { 
      id: 'satis', 
      name: 'Satış', 
      icon: <ShoppingCart size={20} />, 
      path: '/satis',
      hasSubCategories: true,
      subCategories: [
        { id: 'galvaniz-talebi', name: 'Galvaniz Talebi', icon: <PlusCircle size={18} />, path: '/satis/galvaniz-talebi', hasSubItems: false },
      ]
    },
    { 
      id: 'crm', 
      name: 'CRM', 
      icon: <Users size={20} />,
      path: '/crm',
      hasSubCategories: true,
      subCategories: [
        { id: 'lead-kanban', name: 'Lead Kanban', icon: <Layers size={18} />, path: '/under-construction', hasSubItems: false },
        { id: 'musteriler', name: 'Müşteriler', icon: <Briefcase size={18} />, path: '/under-construction', hasSubItems: false },
        { id: 'rakipler', name: 'Rakipler', icon: <Target size={18} />, path: '/under-construction', hasSubItems: false },
        { id: 'fiyatlar', name: 'Fiyatlar', icon: <DollarSign size={18} />, path: '/under-construction', hasSubItems: false },
        { id: 'feedback', name: 'Feedback', icon: <MessageSquare size={18} />, path: '/under-construction', hasSubItems: false },
        { id: 'deal-kanban', name: 'Deal Kanban', icon: <Shuffle size={18} />, path: '/under-construction', hasSubItems: false },
      ]
    },
    { id: 'diger', name: 'Diğer', icon: <Settings size={20} />, path: '/under-construction', hasSubCategories: false },
  ];

  // Active category
  const activeCategory = mainCategories.find(cat => cat.id === activeMainCategory);
  
  // Active sub category
  const activeSubCategoryObject = activeCategory?.subCategories?.find(
    subCat => subCat.id === activeSubCategory
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Navigation */}
      <div className={`bg-gray-900 text-white transition-all duration-300 flex flex-col ${navExpanded ? 'w-72' : 'w-20'} relative z-20`}>
        {/* Logo Area */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <Image
                src="/logo_sade.png"
                alt="Albayrak Logo"
                width={100}
                height={40} 
                className="h-10 w-auto"
            />
            {navExpanded && (
              <div className="text-white font-semibold">Albayrak</div>
            )}
          </Link>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-6 space-y-1">
          {/* Navigation items remain the same... */}
          {mainCategories.map((category) => (
            <div key={category.id} className="px-3">
              {/* Main Category */}
              {category.hasSubCategories ? (
                <button
                  onClick={() => selectMainCategory(category.id)}
                  className={`w-full flex items-center py-3 px-3 rounded-lg transition-colors ${
                    activeMainCategory === category.id 
                      ? 'bg-red-700 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="mr-3">{category.icon}</span>
                  {navExpanded && <span className="font-medium">{category.name}</span>}
                  {navExpanded && category.subCategories && (
                    <span className="ml-auto">
                      {activeMainCategory === category.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                  )}
                </button>
              ) : (
                <Link
                  href={category.path}
                  className={`w-full flex items-center py-3 px-3 rounded-lg transition-colors ${
                    activeMainCategory === category.id 
                      ? 'bg-red-700 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="mr-3">{category.icon}</span>
                  {navExpanded && <span className="font-medium">{category.name}</span>}
                </Link>
              )}

              {/* Sub Categories */}
              {activeMainCategory === category.id && category.subCategories && (
                <div className={`mt-1 ml-2 space-y-1 ${navExpanded ? 'pl-8' : 'pl-2'}`}>
                  {category.subCategories.map((subCategory) => (
                    <div key={subCategory.id}>
                      {/* Sub category items remain the same... */}
                      {subCategory.hasSubItems ? (
                        <button
                          onClick={() => {
                            selectSubCategory(subCategory.id);
                            toggleSubCategory(subCategory.id);
                          }}
                          className={`w-full flex items-center py-2 px-3 rounded-lg text-sm transition-colors ${
                            activeSubCategory === subCategory.id 
                              ? 'bg-red-600/40 text-white' 
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <span className="mr-2">{subCategory.icon}</span>
                          {navExpanded && <span>{subCategory.name}</span>}
                          {navExpanded && subCategory.subItems && (
                            <span className="ml-auto">
                              {expandedSubCategories[subCategory.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                          )}
                        </button>
                      ) : (
                        <Link 
                          href={subCategory.path}
                          className={`w-full flex items-center py-2 px-3 rounded-lg text-sm transition-colors ${
                            activeSubCategory === subCategory.id 
                              ? 'bg-red-600/40 text-white' 
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <span className="mr-2">{subCategory.icon}</span>
                          {navExpanded && <span>{subCategory.name}</span>}
                        </Link>
                      )}

                      {/* Sub items remain the same... */}
                      {navExpanded && expandedSubCategories[subCategory.id] && subCategory.subItems && (
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-red-500/50 pl-2">
                          {subCategory.subItems.map((item) => {
                            // Check permission for Maliyet Hesaplama
                            const handleClick = (e: React.MouseEvent) => {
                              if (item.id === 'maliyet' && !canAccessMaliyetHesaplama) {
                                e.preventDefault();
                                setShowPermissionWarning(true);
                              }
                            };
                            
                            return (
                              <Link 
                                key={item.id}
                                href={item.path}
                                onClick={handleClick}
                                className={`w-full flex items-center py-1.5 px-3 text-sm rounded-md ${
                                  activeItem === item.id 
                                    ? 'bg-red-600/40 text-white' 
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                } transition-colors`}
                              >
                                <span className="mr-2 text-gray-500">{item.icon}</span>
                                <span>{item.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Profile Section - Updated to use Auth Context */}
        <div className="p-4 border-t border-gray-800">
          <Link href="/profil" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-red-600">
              {profilePicture ? (
                <img src={profilePicture} alt={user?.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white">
                  <User size={24} />
                </div>
              )}
            </div>
            {navExpanded && (
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user?.username}</p>
                <p className="text-gray-400 text-sm truncate">{user?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</p>
              </div>
            )}
          </Link>

          <button 
            onClick={handleLogout}
            className="w-full mt-3 flex items-center justify-center py-2 px-3 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
          >
            <LogOut size={18} className="mr-2" />
            {navExpanded && 'Çıkış Yap'}
          </button>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <button 
        onClick={toggleNav}
        className="absolute left-0 top-20 bg-red-600 text-white p-2 rounded-r-md shadow-lg z-30 hover:bg-red-700 transition-colors"
        style={{ transform: navExpanded ? `translateX(${navExpanded ? '288px' : '80px'})` : 'translateX(80px)'}}
      >
        {navExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Mobile overlay */}
      {navExpanded && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={toggleNav}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg z-10">
          {/* Curved red element */}
          <div className="absolute right-0 top-0 h-16 w-full overflow-hidden">
            <div className="absolute -right-64 top-0 w-96 h-40 bg-red-600 rounded-full opacity-20 transform -translate-y-20"></div>
          </div>

          <div className="px-6 py-4 flex justify-between items-center relative">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">
                {activeMainCategory 
                  ? activeSubCategory 
                    ? activeItem === 'maliyet'
                      ? "Üretim / Hesaplamalar / Maliyet Hesaplama"
                      : activeItem === 'urun'
                      ? "Üretim / Hesaplamalar / Ürün Hesaplamaları"
                      : `${activeCategory?.name} / ${activeSubCategoryObject?.name}`
                    : activeCategory?.name
                  : 'Hoşgeldiniz'
                }
              </h1>
              
              {/* Breadcrumb */}
              {(activeMainCategory || activeSubCategory) && (
                <div className="ml-6 flex items-center text-gray-400 text-sm">
                  <Link 
                    href="/"
                    className="hover:text-white transition-colors flex items-center"
                  >
                    <Home size={14} className="mr-1" />
                    Ana Sayfa
                  </Link>
                  
                  {activeMainCategory && (
                    <>
                      <span className="mx-2">/</span>
                      <button 
                        onClick={() => setActiveSubCategory(null)}
                        className={`${!activeSubCategory ? 'text-white' : 'hover:text-white transition-colors'}`}
                      >
                        {activeCategory?.name}
                      </button>
                    </>
                  )}
                  
                  {activeSubCategory && (
                  <>
                    <span className="mx-2">/</span>
                    <button 
                      onClick={() => {
                        setActiveSubCategory(null);
                        setActiveItem(null);
                      }}
                      className="hover:text-white transition-colors"
                    >
                      {activeSubCategoryObject?.name}
                    </button>
                  </>
                  )}
                  
                  {activeItem === 'maliyet' && (
                    <>
                      <span className="mx-2">/</span>
                      <span className="text-white">Maliyet Hesaplama</span>
                    </>
                  )}
                  
                  {activeItem === 'urun' && (
                    <>
                      <span className="mx-2">/</span>
                      <span className="text-white">Ürün Hesaplamaları</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Right Side - Search, Notifications */}
            <div className="flex items-center space-x-6">
              <Link href="/arama" className="text-white p-2 rounded-full hover:bg-gray-700 transition-colors" title="Arama">
                <Search size={20} />
              </Link>
              
              <Link href="/bildirimler" className="text-white p-2 relative rounded-full hover:bg-gray-700 transition-colors" title="Bildirimler">
                <Bell size={20} />
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 bg-gray-100">
          <div className="bg-white rounded-lg shadow-md p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Permission Warning Dialog */}
      <Dialog open={showPermissionWarning} onOpenChange={setShowPermissionWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Erişim İzni Gerekli
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-4">
              <p>
                Maliyet Hesaplama sayfasına erişim izniniz bulunmamaktadır.
              </p>
              <p>
                Ürün Hesaplamaları sayfasını kullanarak ağırlık ve diğer ürün hesaplamalarını görüntüleyebilirsiniz.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <button
              onClick={() => setShowPermissionWarning(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Kapat
            </button>
            <button
              onClick={() => {
                setShowPermissionWarning(false);
                router.push('/uretim/hesaplamalar/urun');
              }}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Ürün Hesaplamalarına Git
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainLayout3;
