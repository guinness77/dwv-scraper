import React from 'react';
import { Home, MapPin, Bed, Bath, Square, Phone, User, ExternalLink } from 'lucide-react';
import { Property } from '../types/property';

interface PropertyCardProps {
  property: Property;
  onDelete?: (id: string) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onDelete }) => {
  const formatPrice = (price: string) => {
    // Remove any non-numeric characters except commas and periods
    const cleanPrice = price.replace(/[^\d,.$]/g, '');
    return cleanPrice || price;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      {property.image_url && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={property.image_url}
            alt={property.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="text-sm font-medium text-gray-700">{property.property_type || 'Property'}</span>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 line-clamp-2 flex-1">
            {property.title}
          </h3>
          {property.status && (
            <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
              property.status === 'active' ? 'bg-green-100 text-green-800' :
              property.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {property.status}
            </span>
          )}
        </div>
        
        <div className="text-2xl font-bold text-blue-600 mb-3">
          {formatPrice(property.price)}
        </div>
        
        <div className="flex items-center text-gray-600 mb-4">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="text-sm">{property.location}</span>
        </div>
        
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          {property.bedrooms && (
            <div className="flex items-center">
              <Bed className="w-4 h-4 mr-1" />
              <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center">
              <Bath className="w-4 h-4 mr-1" />
              <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
            </div>
          )}
          {property.square_feet && (
            <div className="flex items-center">
              <Square className="w-4 h-4 mr-1" />
              <span>{property.square_feet.toLocaleString()} sq ft</span>
            </div>
          )}
        </div>
        
        {property.description && (
          <p className="text-gray-700 text-sm mb-4 line-clamp-3">
            {property.description}
          </p>
        )}
        
        {property.features && property.features.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {property.features.slice(0, 3).map((feature, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {feature}
                </span>
              ))}
              {property.features.length > 3 && (
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                  +{property.features.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
        
        {(property.agent_name || property.agent_phone) && (
          <div className="border-t pt-4 mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              {property.agent_name && (
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  <span>{property.agent_name}</span>
                </div>
              )}
              {property.agent_phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  <span>{property.agent_phone}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-gray-500">
            Scraped: {new Date(property.scraped_at).toLocaleDateString()}
          </div>
          <div className="flex gap-2">
            <a
              href={property.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View Listing
            </a>
            {onDelete && property.id && (
              <button
                onClick={() => onDelete(property.id!)}
                className="px-3 py-1.5 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};