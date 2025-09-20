'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';

export interface InboxFilters {
  search: string;
  status: 'all' | 'flying' | 'delivered';
  sortBy: 'created_at' | 'delivered_at' | 'title';
  sortOrder: 'asc' | 'desc';
}

interface InboxFiltersProps {
  filters: InboxFilters;
  onFiltersChange: (filters: InboxFilters) => void;
  messageCount: number;
}

export function InboxFiltersComponent({ 
  filters, 
  onFiltersChange, 
  messageCount 
}: InboxFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      status: value as 'all' | 'flying' | 'delivered' 
    });
  };

  const handleSortByChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      sortBy: value as 'created_at' | 'delivered_at' | 'title' 
    });
  };

  const handleSortOrderChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      sortOrder: value as 'asc' | 'desc' 
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = filters.search || filters.status !== 'all';

  return (
    <div className="space-y-3">
      {/* Main Filter Row - Compact */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search postcards..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 bg-white/80 backdrop-blur-sm border-gray-300"
          />
        </div>
        
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-gray-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Postcards</SelectItem>
            <SelectItem value="flying">✈️ Flying</SelectItem>
            <SelectItem value="delivered">📬 Delivered</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.sortBy} onValueChange={handleSortByChange}>
          <SelectTrigger className="w-36 bg-white/80 backdrop-blur-sm border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date Sent</SelectItem>
            <SelectItem value="delivered_at">Delivered</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filters.sortOrder} onValueChange={handleSortOrderChange}>
          <SelectTrigger className="w-28 bg-white/80 backdrop-blur-sm border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">↓ New</SelectItem>
            <SelectItem value="asc">↑ Old</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-gray-600 hover:text-gray-800 bg-white/60 backdrop-blur-sm"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters and Count - Compact */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-600 font-medium">
          {messageCount} postcard{messageCount !== 1 ? 's' : ''}
        </span>
        
        {filters.search && (
          <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800">
            "{filters.search}"
            <button 
              onClick={() => handleSearchChange('')}
              className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        
        {filters.status !== 'all' && (
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
            {filters.status === 'flying' ? '✈️ Flying' : '📬 Delivered'}
            <button 
              onClick={() => handleStatusChange('all')}
              className="ml-1 hover:bg-green-200 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>
    </div>
  );
}