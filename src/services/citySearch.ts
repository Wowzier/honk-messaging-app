interface CitySearchResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // State/Province
  population?: number;
}

export class CitySearchService {
  private baseUrl = 'https://geocoding-api.open-meteo.com/v1/search';

  async searchCities(query: string): Promise<CitySearchResult[]> {
    try {
      const url = `${this.baseUrl}?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch city data');
      }

      const data = await response.json();
      
      if (!data.results) {
        return [];
      }

      return data.results.map((result: any) => ({
        name: result.name,
        latitude: result.latitude,
        longitude: result.longitude,
        country: result.country,
        admin1: result.admin1,
        population: result.population
      }));
    } catch (error) {
      console.error('Error searching cities:', error);
      return [];
    }
  }
}

export const citySearchService = new CitySearchService();