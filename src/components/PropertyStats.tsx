import React from 'react';
import { Home, DollarSign, MapPin, Calendar } from 'lucide-react';
import { Property } from '../types/property';

interface PropertyStatsProps {
  properties: Property[];
}

export const PropertyStats: React.FC<PropertyStatsProps> = ({ properties }) => {
  const stats = React.useMemo(() => {
    const totalProperties = properties.length;
    const averagePrice = properties.reduce((sum, prop) => {
      const price = parseFloat(prop.price.replace(/[^\d.]/g, ''));
      return sum + (isNaN(price) ? 0 : price);
    }, 0) / totalProperties;
    
    const uniqueLocations = new Set(properties.map(prop => prop.location)).size;
    const recentScraped = properties.filter(prop => 
      new Date(prop.scraped_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length;
    
    return {
      totalProperties,
      averagePrice: isNaN(averagePrice) ? 0 : averagePrice,
      uniqueLocations,
      recentScraped
    };
  }, [properties]);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price.toFixed(0)}`;
  };

  const statItems = [
    {
      icon: Home,
      label: 'Total Properties',
      value: stats.totalProperties.toLocaleString(),
      color: 'text-blue-600'
    },
    {
      icon: DollarSign,
      label: 'Average Price',
      value: stats.averagePrice > 0 ? formatPrice(stats.averagePrice) : 'N/A',
      color: 'text-emerald-600'
    },
    {
      icon: MapPin,
      label: 'Unique Locations',
      value: stats.uniqueLocations.toLocaleString(),
      color: 'text-orange-600'
    },
    {
      icon: Calendar,
      label: 'Scraped Today',
      value: stats.recentScraped.toLocaleString(),
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statItems.map((item, index) => (
        <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
            </div>
            <div className={`p-3 rounded-full bg-gray-50 ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};