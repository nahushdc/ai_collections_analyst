import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Download, Filter, X, ChevronDown, TrendingUp, BarChart3 } from 'lucide-react';
import { createPortal } from 'react-dom';
import ResultTable from './ResultTable';
import ResultChart from './ResultChart';
import QueryLoadingState from './QueryLoadingState';
import { exportToExcel, fetchRegions } from '../api/client';

export default function StateCollectionView({ result, loading, queryText, onClose }) {
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [regions, setRegions] = useState([]);
  const stateButtonRef = useRef(null);
  const regionButtonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  // Fetch regions for filtering
  useEffect(() => {
    fetchRegions()
      .then((data) => setRegions(data.regions))
      .catch((err) => console.error('Failed to load regions:', err));
  }, []);

  // Hardcoded region-to-states mapping (Indian states & UTs)
  const regionToStates = {
    NORTH: ['Delhi', 'Punjab', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Uttarakhand', 'Uttar Pradesh', 'Rajasthan', 'Chandigarh', 'Ladakh'],
    SOUTH: ['Andhra Pradesh', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Telangana', 'Puducherry', 'Lakshadweep'],
    EAST: ['West Bengal', 'Odisha', 'Bihar', 'Jharkhand', 'Assam', 'Arunachal Pradesh', 'Chhattisgarh', 'Meghalaya', 'Tripura', 'Nagaland', 'Manipur', 'Sikkim', 'Andaman and Nicobar Islands', 'Mizoram'],
    WEST: ['Gujarat', 'Maharashtra', 'Goa', 'Madhya Pradesh', 'Daman and Diu', 'Dadra and Nagar Haveli'],
  };

  // Extract unique states from data, filtered by selected regions
  const availableStates = useMemo(() => {
    if (!result?.data || result.data.length === 0) return [];
    const stateSet = new Set();
    result.data.forEach(row => {
      if (row.State || row.state) {
        stateSet.add(row.State || row.state);
      }
    });
    let states = Array.from(stateSet);
    // If regions are selected, only show states from those regions in the state dropdown
    if (selectedRegions.length > 0) {
      const regionStates = new Set();
      selectedRegions.forEach(region => {
        (regionToStates[region] || []).forEach(s => regionStates.add(s));
      });
      states = states.filter(s => regionStates.has(s));
    }
    return states.sort();
  }, [result, selectedRegions]);

  // Filter data based on state and region selections
  const filteredData = useMemo(() => {
    if (!result?.data) return [];

    // Get states to filter by
    let statesToFilter = new Set(selectedStates);

    // If regions are selected, add all states from those regions
    if (selectedRegions.length > 0) {
      selectedRegions.forEach(region => {
        const statesInRegion = regionToStates[region] || [];
        statesInRegion.forEach(state => statesToFilter.add(state));
      });
    }

    // If no filters selected, show all data
    if (statesToFilter.size === 0) return result.data;

    // Filter by the combined state list
    return result.data.filter(row => {
      const rowState = row.State || row.state;
      return statesToFilter.has(rowState);
    });
  }, [result, selectedStates, selectedRegions]);

  const handleExport = () => {
    exportToExcel(filteredData, result.columns);
  };

  const handleStateToggle = (stateName) => {
    setSelectedStates(prev =>
      prev.includes(stateName)
        ? prev.filter(s => s !== stateName)
        : [...prev, stateName]
    );
  };

  const handleRegionToggle = (regionName) => {
    setSelectedRegions(prev =>
      prev.includes(regionName)
        ? prev.filter(r => r !== regionName)
        : [...prev, regionName]
    );
  };

  const updateDropdownPosition = (buttonRef, width = 256) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - width, // Align right edge
      });
    }
  };

  useEffect(() => {
    if (showStateDropdown && stateButtonRef.current) {
      updateDropdownPosition(stateButtonRef, 256); // w-64
    }
  }, [showStateDropdown]);

  useEffect(() => {
    if (showRegionDropdown && regionButtonRef.current) {
      updateDropdownPosition(regionButtonRef, 224); // w-56
    }
  }, [showRegionDropdown]);

  if (loading) {
    return <QueryLoadingState queryText={queryText} variant="standard" />;
  }

  if (!result) return null;

  return (
    <div className="relative space-y-6">
      {/* Header with Filters */}
      <div className="relative rounded-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h3 className="mb-2 text-lg font-semibold text-slate-200">Collection by State & UT</h3>
            <p className="text-sm text-slate-400">
              Showing <span className="font-semibold text-violet-300">{filteredData.length}</span> of{' '}
              <span className="font-semibold text-slate-300">{result.row_count}</span> results
            </p>
          </div>

          {/* Filter Controls */}
          <div className="relative flex items-center gap-3 flex-wrap" style={{ zIndex: 100 }}>
            {/* Region Dropdown */}
            {regions.length > 0 && (
              <div className="relative">
                <button
                  ref={regionButtonRef}
                  onClick={() => {
                    setShowRegionDropdown(!showRegionDropdown);
                    setShowStateDropdown(false);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-500/70 hover:bg-slate-700/60"
                >
                  <Filter size={16} />
                  <span>
                    {selectedRegions.length > 0
                      ? `${selectedRegions.length} Region${selectedRegions.length > 1 ? 's' : ''}`
                      : 'Filter by Region'}
                  </span>
                  <ChevronDown size={16} />
                </button>

                {showRegionDropdown && createPortal(
                  <>
                    {/* Backdrop to close dropdown when clicking outside */}
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setShowRegionDropdown(false)}
                    />
                    <div
                      className="fixed z-[9999] w-56 rounded-lg border border-slate-600/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                      }}
                    >
                      <div className="p-2">
                        {regions.map((region) => (
                          <label
                            key={region.name}
                            className="flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors hover:bg-slate-800/60"
                          >
                            <input
                              type="checkbox"
                              checked={selectedRegions.includes(region.name)}
                              onChange={() => handleRegionToggle(region.name)}
                              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-600 focus:ring-2 focus:ring-violet-500"
                            />
                            <span className="text-sm text-slate-300">{region.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>,
                  document.body
                )}
              </div>
            )}

            {/* State Dropdown */}
            {availableStates.length > 0 && (
              <div className="relative">
                <button
                  ref={stateButtonRef}
                  onClick={() => {
                    setShowStateDropdown(!showStateDropdown);
                    setShowRegionDropdown(false);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-500/70 hover:bg-slate-700/60"
                >
                  <Filter size={16} />
                  <span>
                    {selectedStates.length > 0
                      ? `${selectedStates.length} State${selectedStates.length > 1 ? 's' : ''}`
                      : 'Filter by State'}
                  </span>
                  <ChevronDown size={16} />
                </button>

                {showStateDropdown && createPortal(
                  <>
                    {/* Backdrop to close dropdown when clicking outside */}
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setShowStateDropdown(false)}
                    />
                    <div
                      className="fixed z-[9999] max-h-96 w-64 overflow-y-auto rounded-lg border border-slate-600/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                      }}
                    >
                      <div className="p-2">
                        {availableStates.map((state) => (
                          <label
                            key={state}
                            className="flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors hover:bg-slate-800/60"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStates.includes(state)}
                              onChange={() => handleStateToggle(state)}
                              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-600 focus:ring-2 focus:ring-violet-500"
                            />
                            <span className="text-sm text-slate-300">{state}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>,
                  document.body
                )}
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-500/70 hover:bg-slate-700/60 hover:text-slate-100"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Active Filters */}
        {(selectedRegions.length > 0 || selectedStates.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedRegions.map((region) => (
              <span
                key={region}
                className="flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-600/20 px-3 py-1 text-xs font-medium text-violet-300"
              >
                {region}
                <button
                  onClick={() => handleRegionToggle(region)}
                  className="ml-1 transition-colors hover:text-violet-100"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            {selectedStates.map((state) => (
              <span
                key={state}
                className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-600/20 px-3 py-1 text-xs font-medium text-cyan-300"
              >
                {state}
                <button
                  onClick={() => handleStateToggle(state)}
                  className="ml-1 transition-colors hover:text-cyan-100"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <ResultChart chart={result.chart} data={filteredData} showTooltip={true} />

      {/* Table */}
      <ResultTable columns={result.columns} data={filteredData} />
    </div>
  );
}
