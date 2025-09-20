'use client';

import React from 'react';
import './SteampunkSearch.css';

interface SteampunkSearchProps {
  value: string;
  onChange: (value: string) => void;
  onFilterClick: () => void;
  placeholder?: string;
}

export default function SteampunkSearch({ 
  value, 
  onChange, 
  onFilterClick, 
  placeholder = "Query The Aether..." 
}: SteampunkSearchProps) {
  return (
    <div className="steampunk-search-body">
      <div id="poda">
        <div className="border"></div>
        <div id="main">
          <input
            placeholder={placeholder}
            type="text"
            name="text"
            className="steampunk-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <div id="search-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              viewBox="0 0 24 24"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              height="22"
              fill="none"
            >
              <circle r="8" cy="11" cx="11"></circle>
              <line y2="16.65" y1="22" x2="16.65" x1="22"></line>
              <defs></defs>
            </svg>
          </div>
          <div id="filter-icon" onClick={onFilterClick}>
            <svg
              preserveAspectRatio="none"
              height="24"
              width="24"
              viewBox="4.8 4.56 14.832 15.408"
              fill="none"
            >
              <path d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}