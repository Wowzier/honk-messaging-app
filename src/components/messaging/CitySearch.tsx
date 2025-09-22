import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { citySearchService } from '@/services/citySearch';

interface CitySearchProps {
  onCitySelect: (name: string, lat: number, lon: number) => void;
  disabled?: boolean;
}

export function CitySearch({ onCitySelect, disabled }: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    admin1?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchCities = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const cityResults = await citySearchService.searchCities(searchQuery);
      setResults(cityResults);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching cities:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchCities(value);
    }, 300);
  };

  const handleCitySelect = (city: typeof results[0]) => {
    setQuery(`${city.name}, ${city.admin1 ? `${city.admin1}, ` : ''}${city.country}`);
    onCitySelect(city.name, city.latitude, city.longitude);
    setShowResults(false);
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search for a city..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
          disabled={disabled}
          className="flex-1"
        />
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200"
        >
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Searching cities...</div>
          ) : results.length > 0 ? (
            <div className="py-1">
              {results.map((city, index) => (
                <button
                  key={`${city.name}-${index}`}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={() => handleCitySelect(city)}
                >
                  <div className="font-medium">{city.name}</div>
                  <div className="text-sm text-gray-500">
                    {[city.admin1, city.country].filter(Boolean).join(', ')}
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">No cities found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}