// function statistics() {
//     return (
//         <div class="statistics-container">
//             <h2 class="text-center">Statistics</h2>
//             <p class="text-center">This section is under construction. Please check back later for updates.</p>
//         </div>
//     );
// }

// export default statistics;

import { useState, useMemo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function Statistics() {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCrimeType, setSelectedCrimeType] = useState('all');
  const [viewMode, setViewMode] = useState('overview');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Comprehensive crime statistics data
  const crimeStatistics = {
    summary: {
      totalIncidents: 15423,
      activeInvestigations: 3456,
      convictions: 2345,
      pendingTrials: 4567,
      clearanceRate: 32.5,
      crimeRatePer1000: 45.2,
      yearOverYearChange: -2.3,
      monthlyAverage: 1285
    },
    
    yearlyData: {
      '2024': {
        total: 15892,
        clearance: 31.2,
        trends: [1243, 1189, 1345, 1278, 1456, 1321, 1467, 1389, 1298, 1356, 1245, 1198]
      },
      '2025': {
        total: 15678,
        clearance: 31.8,
        trends: [1212, 1198, 1302, 1245, 1402, 1289, 1421, 1356, 1267, 1321, 1211, 1156]
      },
      '2026': {
        total: 15423,
        clearance: 32.5,
        trends: [1198, 1156, 1267, 1201, 1367, 1245, 1389, 1302, 1212, 1267, 1167, 1123]
      }
    },

    crimeCategories: [
      {
        category: 'Property Crime',
        incidents: 6789,
        percentage: 44.0,
        breakdown: [
          { type: 'Burglary', count: 2456, percentage: 36.2, trend: -2.1, avgValue: '$1,200' },
          { type: 'Theft', count: 3123, percentage: 46.0, trend: -1.5, avgValue: '$450' },
          { type: 'Vehicle Theft', count: 876, percentage: 12.9, trend: -4.2, avgValue: '$5,500' },
          { type: 'Arson', count: 334, percentage: 4.9, trend: +1.8, avgValue: '$8,000' }
        ]
      },
      {
        category: 'Violent Crime',
        incidents: 3456,
        percentage: 22.4,
        breakdown: [
          { type: 'Assault', count: 1876, percentage: 54.3, trend: +3.2 },
          { type: 'Robbery', count: 987, percentage: 28.6, trend: +2.8 },
          { type: 'Homicide', count: 234, percentage: 6.8, trend: -1.5 },
          { type: 'Kidnapping', count: 359, percentage: 10.4, trend: -0.7 }
        ]
      },
      {
        category: 'Financial Crime',
        incidents: 2456,
        percentage: 15.9,
        breakdown: [
          { type: 'Fraud', count: 1345, percentage: 54.8, trend: +5.2, avgLoss: '$3,200' },
          { type: 'Money Laundering', count: 456, percentage: 18.6, trend: +2.3, avgLoss: '$15,000' },
          { type: 'Cyber Crime', count: 432, percentage: 17.6, trend: +8.7, avgLoss: '$2,800' },
          { type: 'Corruption', count: 223, percentage: 9.1, trend: -1.2, avgLoss: '$5,500' }
        ]
      },
      {
        category: 'Drug Related',
        incidents: 1890,
        percentage: 12.3,
        breakdown: [
          { type: 'Possession', count: 987, percentage: 52.2, trend: -3.4 },
          { type: 'Trafficking', count: 543, percentage: 28.7, trend: +4.1 },
          { type: 'Manufacturing', count: 234, percentage: 12.4, trend: +2.3 },
          { type: 'Paraphernalia', count: 126, percentage: 6.7, trend: -1.8 }
        ]
      },
      {
        category: 'Other Offenses',
        incidents: 832,
        percentage: 5.4,
        breakdown: [
          { type: 'Public Disorder', count: 345, percentage: 41.5, trend: +0.5 },
          { type: 'Traffic Offenses', count: 287, percentage: 34.5, trend: -4.2 },
          { type: 'Wildlife Crime', count: 123, percentage: 14.8, trend: +6.3 },
          { type: 'Vandalism', count: 77, percentage: 9.3, trend: -2.1 }
        ]
      }
    ],

    regionalData: [
      {
        region: 'Harare Central',
        incidents: 4234,
        population: 850000,
        crimeRate: 49.8,
        clearance: 34.2,
        trends: [345, 332, 356, 341, 367, 352, 371, 358, 345, 352, 338, 327]
      },
      {
        region: 'Bulawayo',
        incidents: 2890,
        population: 650000,
        crimeRate: 44.5,
        clearance: 31.8,
        trends: [234, 221, 245, 232, 256, 241, 262, 248, 235, 241, 228, 217]
      },
      {
        region: 'Manicaland',
        incidents: 1956,
        population: 450000,
        crimeRate: 43.5,
        clearance: 30.5,
        trends: [156, 148, 167, 159, 178, 164, 182, 169, 158, 164, 152, 145]
      },
      {
        region: 'Mashonaland West',
        incidents: 1789,
        population: 420000,
        crimeRate: 42.6,
        clearance: 29.8,
        trends: [145, 138, 152, 144, 161, 149, 167, 154, 146, 151, 142, 136]
      },
      {
        region: 'Mashonaland East',
        incidents: 1543,
        population: 380000,
        crimeRate: 40.6,
        clearance: 32.1,
        trends: [123, 117, 131, 125, 139, 129, 144, 133, 125, 130, 121, 116]
      },
      {
        region: 'Masvingo',
        incidents: 1234,
        population: 320000,
        crimeRate: 38.6,
        clearance: 28.9,
        trends: [98, 92, 105, 99, 111, 103, 116, 107, 100, 104, 97, 92]
      },
      {
        region: 'Matabeleland North',
        incidents: 987,
        population: 280000,
        crimeRate: 35.2,
        clearance: 33.4,
        trends: [78, 73, 83, 79, 89, 82, 92, 85, 80, 83, 78, 74]
      },
      {
        region: 'Matabeleland South',
        incidents: 876,
        population: 250000,
        crimeRate: 35.0,
        clearance: 34.7,
        trends: [71, 66, 75, 71, 79, 74, 83, 77, 72, 75, 70, 67]
      }
    ],

    timeAnalysis: {
      hourly: [
        { hour: '00-03', incidents: 1123, percentage: 7.3 },
        { hour: '03-06', incidents: 876, percentage: 5.7 },
        { hour: '06-09', incidents: 1456, percentage: 9.4 },
        { hour: '09-12', incidents: 2345, percentage: 15.2 },
        { hour: '12-15', incidents: 2678, percentage: 17.4 },
        { hour: '15-18', incidents: 2543, percentage: 16.5 },
        { hour: '18-21', incidents: 2345, percentage: 15.2 },
        { hour: '21-00', incidents: 2057, percentage: 13.3 }
      ],
      daily: [
        { day: 'Monday', count: 2234, percentage: 14.5 },
        { day: 'Tuesday', count: 2145, percentage: 13.9 },
        { day: 'Wednesday', count: 2198, percentage: 14.3 },
        { day: 'Thursday', count: 2312, percentage: 15.0 },
        { day: 'Friday', count: 2678, percentage: 17.4 },
        { day: 'Saturday', count: 1987, percentage: 12.9 },
        { day: 'Sunday', count: 1869, percentage: 12.1 }
      ],
      monthly: [
        { month: 'Jan', count: 1198, percentage: 7.8 },
        { month: 'Feb', count: 1156, percentage: 7.5 },
        { month: 'Mar', count: 1267, percentage: 8.2 },
        { month: 'Apr', count: 1201, percentage: 7.8 },
        { month: 'May', count: 1367, percentage: 8.9 },
        { month: 'Jun', count: 1245, percentage: 8.1 },
        { month: 'Jul', count: 1389, percentage: 9.0 },
        { month: 'Aug', count: 1302, percentage: 8.4 },
        { month: 'Sep', count: 1212, percentage: 7.9 },
        { month: 'Oct', count: 1267, percentage: 8.2 },
        { month: 'Nov', count: 1167, percentage: 7.6 },
        { month: 'Dec', count: 1123, percentage: 7.3 }
      ]
    },

    demographics: {
      victims: {
        ageGroups: [
          { group: '0-17', count: 2345, percentage: 15.2 },
          { group: '18-25', count: 3890, percentage: 25.2 },
          { group: '26-35', count: 4123, percentage: 26.7 },
          { group: '36-50', count: 3123, percentage: 20.3 },
          { group: '50+', count: 1942, percentage: 12.6 }
        ],
        gender: [
          { type: 'Male', count: 8234, percentage: 53.4 },
          { type: 'Female', count: 7189, percentage: 46.6 }
        ]
      },
      offenders: {
        ageGroups: [
          { group: '0-17', count: 1234, percentage: 12.4 },
          { group: '18-25', count: 3456, percentage: 34.8 },
          { group: '26-35', count: 2987, percentage: 30.1 },
          { group: '36-50', count: 1678, percentage: 16.9 },
          { group: '50+', count: 567, percentage: 5.7 }
        ],
        gender: [
          { type: 'Male', count: 8234, percentage: 82.9 },
          { type: 'Female', count: 1698, percentage: 17.1 }
        ]
      }
    },

    weaponAnalysis: [
      { type: 'Firearms', count: 1234, percentage: 22.3, trend: -1.2 },
      { type: 'Knives/Sharp Objects', count: 2345, percentage: 42.4, trend: +2.3 },
      { type: 'Blunt Objects', count: 987, percentage: 17.8, trend: +0.5 },
      { type: 'Physical Force', count: 678, percentage: 12.3, trend: -0.8 },
      { type: 'Other', count: 287, percentage: 5.2, trend: -0.3 }
    ],

    recoveryStats: {
      itemsRecovered: 5678,
      recoveryRate: 42.5,
      totalValue: 3450000,
      averageRecoveryTime: 72, // hours
      byCategory: [
        { category: 'Vehicles', recovered: 432, percentage: 49.3, avgTime: 48 },
        { category: 'Electronics', recovered: 2345, percentage: 41.2, avgTime: 96 },
        { category: 'Cash', recovered: 1567, percentage: 38.9, avgTime: 24 },
        { category: 'Jewelry', recovered: 876, percentage: 45.6, avgTime: 120 },
        { category: 'Documents', recovered: 458, percentage: 67.8, avgTime: 168 }
      ]
    }
  };

  // Sorting function
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Memoized sorted data
  const sortedRegionalData = useMemo(() => {
    let sortableData = [...crimeStatistics.regionalData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [sortConfig]);

  // Filtered data based on selections
  const filteredCrimeData = useMemo(() => {
    if (selectedCrimeType === 'all') return crimeStatistics.crimeCategories;
    return crimeStatistics.crimeCategories.filter(cat => 
      cat.category.toLowerCase().includes(selectedCrimeType.toLowerCase())
    );
  }, [selectedCrimeType]);

  // Statistics Card Component
  const StatCard = ({ title, value, change, icon, color, subtitle }) => (
    <div className="card shadow-sm h-100 border-0">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className={`bg-${color} bg-opacity-10 p-2 rounded`}>
            <i className={`bi bi-${icon} text-${color} fs-4`}></i>
          </div>
          {change !== undefined && (
            <span className={`badge bg-${change >= 0 ? 'success' : 'danger'} bg-opacity-10 text-${change >= 0 ? 'success' : 'danger'}`}>
              <i className={`bi bi-arrow-${change >= 0 ? 'up' : 'down'} me-1`}></i>
              {Math.abs(change)}%
            </span>
          )}
        </div>
        <h6 className="text-muted mb-1">{title}</h6>
        <h3 className="fw-bold mb-0">{value}</h3>
        {subtitle && <small className="text-muted">{subtitle}</small>}
      </div>
    </div>
  );

  // Progress Bar Component
  const ProgressBar = ({ value, max, label, color = 'primary' }) => (
    <div className="mb-2">
      <div className="d-flex justify-content-between small mb-1">
        <span>{label}</span>
        <span className="fw-bold">{value}%</span>
      </div>
      <div className="progress" style={{ height: '6px' }}>
        <div 
          className={`progress-bar bg-${color}`} 
          style={{ width: `${(value/max)*100}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">
        {/* Header */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom">
            <div className='my-0'>
                <h1 className="display-6 fw-bold text-dark">
                  <i className="bi bi-bar-chart-steps me-3 text-primary"></i>
                  Crime Statistics
                </h1>
                {/* <p className="text-muted">
                  Comprehensive statistical analysis and crime data for Zimbabwe (Updated: March 2026)
                </p> */}
            </div>
            <div className="user-profile py-2 px-0 ">
                <span className="badge bg-primary text-dark rounded-2">Admin User</span>
            </div>
        </header>

        <div className="row mb-2 mt-2">
          <div className="col-12">
            <div className="d-flex justify-content-end align-items-center">
              <div className="d-flex gap-2">
                <select 
                  className="form-select w-auto"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
                <select 
                  className="form-select w-auto"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  <option value="all">All Regions</option>
                  {crimeStatistics.regionalData.map(region => (
                    <option key={region.region} value={region.region}>{region.region}</option>
                  ))}
                </select>
                <button className="btn btn-outline-primary">
                  <i className="bi bi-download"></i> Export
                </button>
                <button className="btn btn-primary">
                  <i className="bi bi-calendar-check"></i> Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <StatCard 
              title="Total Incidents"
              value={crimeStatistics.summary.totalIncidents.toLocaleString()}
              change={crimeStatistics.summary.yearOverYearChange}
              icon="exclamation-triangle"
              color="danger"
              subtitle="Year to date"
            />
          </div>
          <div className="col-md-3">
            <StatCard 
              title="Clearance Rate"
              value={`${crimeStatistics.summary.clearanceRate}%`}
              change={1.3}
              icon="check-circle"
              color="success"
              subtitle="Cases solved"
            />
          </div>
          <div className="col-md-3">
            <StatCard 
              title="Crime Rate"
              value={`${crimeStatistics.summary.crimeRatePer1000}/1000`}
              change={-1.2}
              icon="people"
              color="warning"
              subtitle="Per 1000 population"
            />
          </div>
          <div className="col-md-3">
            <StatCard 
              title="Active Cases"
              value={crimeStatistics.summary.activeInvestigations.toLocaleString()}
              icon="briefcase"
              color="info"
              subtitle="Under investigation"
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="btn-group" role="group">
              <button 
                className={`btn ${viewMode === 'overview' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('overview')}
              >
                <i className="bi bi-grid"></i> Overview
              </button>
              <button 
                className={`btn ${viewMode === 'detailed' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('detailed')}
              >
                <i className="bi bi-table"></i> Detailed Analysis
              </button>
              <button 
                className={`btn ${viewMode === 'comparative' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('comparative')}
              >
                <i className="bi bi-bar-chart"></i> Comparative
              </button>
              <button 
                className={`btn ${viewMode === 'trends' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('trends')}
              >
                <i className="bi bi-graph-up"></i> Trends
              </button>
            </div>
          </div>
        </div>

        {/* Overview View */}
        {viewMode === 'overview' && (
          <>
            {/* Crime Categories */}
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="card shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0">
                      <i className="bi bi-pie-chart me-2 text-primary"></i>
                      Crime Categories Distribution
                    </h5>
                  </div>
                  <div className="card-body">
                    {crimeStatistics.crimeCategories.map((category, idx) => (
                      <div key={idx} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold">{category.category}</span>
                          <div>
                            <span className="badge bg-primary me-2">{category.incidents}</span>
                            <span className="text-muted">{category.percentage}%</span>
                          </div>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div 
                            className="progress-bar" 
                            style={{ 
                              width: `${category.percentage}%`,
                              backgroundColor: idx === 0 ? '#dc3545' : idx === 1 ? '#fd7e14' : idx === 2 ? '#ffc107' : idx === 3 ? '#20c997' : '#0dcaf0'
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time Analysis */}
              <div className="col-md-6">
                <div className="card shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0">
                      <i className="bi bi-clock me-2 text-primary"></i>
                      Time of Day Analysis
                    </h5>
                  </div>
                  <div className="card-body">
                    {crimeStatistics.timeAnalysis.hourly.map((period, idx) => (
                      <div key={idx} className="mb-2">
                        <div className="d-flex justify-content-between small mb-1">
                          <span>{period.hour}</span>
                          <span className="fw-bold">{period.incidents} ({period.percentage}%)</span>
                        </div>
                        <div className="progress" style={{ height: '4px' }}>
                          <div 
                            className="progress-bar bg-info" 
                            style={{ width: `${period.percentage * 4}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Regional Comparison */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="bi bi-map me-2 text-primary"></i>
                      Regional Crime Statistics
                    </h5>
                    <div className="form-check form-switch">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="sortToggle"
                        onChange={() => requestSort('incidents')}
                      />
                      <label className="form-check-label" htmlFor="sortToggle">Sort by incidents</label>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Region</th>
                            <th onClick={() => requestSort('incidents')} style={{ cursor: 'pointer' }}>
                              Incidents <i className={`bi bi-arrow-${sortConfig.key === 'incidents' ? (sortConfig.direction === 'asc' ? 'up' : 'down') : 'down-up'}`}></i>
                            </th>
                            <th>Population</th>
                            <th>Crime Rate/1000</th>
                            <th>Clearance Rate</th>
                            <th>Trend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedRegionalData.map((region, idx) => (
                            <tr key={idx}>
                              <td className="fw-bold">{region.region}</td>
                              <td>{region.incidents.toLocaleString()}</td>
                              <td>{region.population.toLocaleString()}</td>
                              <td>
                                <span className={`badge bg-${region.crimeRate > 45 ? 'danger' : region.crimeRate > 40 ? 'warning' : 'success'}`}>
                                  {region.crimeRate}
                                </span>
                              </td>
                              <td>{region.clearance}%</td>
                              <td>
                                <div style={{ width: '80px' }}>
                                  {region.trends.slice(-3).map((val, i) => (
                                    <span 
                                      key={i} 
                                      className={`badge bg-${val > region.trends[region.trends.length-4] ? 'success' : 'danger'} me-1`}
                                      style={{ fontSize: '0.7rem' }}
                                    >
                                      {val > region.trends[region.trends.length-4] ? '↑' : '↓'}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Detailed Analysis View */}
        {viewMode === 'detailed' && (
          <>
            {/* Crime Breakdown */}
            <div className="row g-4 mb-4">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0">
                      <i className="bi bi-diagram-3 me-2 text-primary"></i>
                      Detailed Crime Breakdown
                    </h5>
                  </div>
                  <div className="card-body">
                    {filteredCrimeData.map((category, catIdx) => (
                      <div key={catIdx} className="mb-4">
                        <h6 className="text-primary fw-bold mb-3">{category.category}</h6>
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Crime Type</th>
                                <th>Count</th>
                                <th>Percentage</th>
                                <th>Trend</th>
                                <th>Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {category.breakdown.map((crime, idx) => (
                                <tr key={idx}>
                                  <td>{crime.type}</td>
                                  <td className="fw-bold">{crime.count}</td>
                                  <td>{crime.percentage}%</td>
                                  <td>
                                    <span className={`badge bg-${crime.trend > 0 ? 'danger' : 'success'}`}>
                                      {crime.trend > 0 ? '+' : ''}{crime.trend}%
                                    </span>
                                  </td>
                                  <td>
                                    {crime.avgValue && (
                                      <small className="text-muted">Avg: {crime.avgValue}</small>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Demographics */}
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="card shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0">
                      <i className="bi bi-people me-2 text-primary"></i>
                      Victim Demographics
                    </h5>
                  </div>
                  <div className="card-body">
                    <h6 className="text-muted mb-3">Age Distribution</h6>
                    {crimeStatistics.demographics.victims.ageGroups.map((group, idx) => (
                      <ProgressBar 
                        key={idx}
                        label={group.group}
                        value={group.percentage}
                        max={30}
                        color={idx === 2 ? 'danger' : 'primary'}
                      />
                    ))}
                    <hr />
                    <h6 className="text-muted mb-3">Gender Distribution</h6>
                    <div className="row text-center">
                      {crimeStatistics.demographics.victims.gender.map((gender, idx) => (
                        <div key={idx} className="col-6">
                          <div className={`p-3 rounded bg-${idx === 0 ? 'primary' : 'danger'} bg-opacity-10`}>
                            <h4 className={`text-${idx === 0 ? 'primary' : 'danger'}`}>{gender.percentage}%</h4>
                            <small className="text-muted">{gender.type}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm">
                  <div className="card-header bg-white py-3">
                    <h5 className="mb-0">
                      <i className="bi bi-person-badge me-2 text-primary"></i>
                      Offender Demographics
                    </h5>
                  </div>
                  <div className="card-body">
                    <h6 className="text-muted mb-3">Age Distribution</h6>
                    {crimeStatistics.demographics.offenders.ageGroups.map((group, idx) => (
                      <ProgressBar 
                        key={idx}
                        label={group.group}
                        value={group.percentage}
                        max={35}
                        color="warning"
                      />
                    ))}
                    <hr />
                    <h6 className="text-muted mb-3">Gender Distribution</h6>
                    <div className="row text-center">
                      {crimeStatistics.demographics.offenders.gender.map((gender, idx) => (
                        <div key={idx} className="col-6">
                          <div className={`p-3 rounded bg-${idx === 0 ? 'primary' : 'danger'} bg-opacity-10`}>
                            <h4 className={`text-${idx === 0 ? 'primary' : 'danger'}`}>{gender.percentage}%</h4>
                            <small className="text-muted">{gender.type}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Comparative View */}
        {viewMode === 'comparative' && (
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0">
                    <i className="bi bi-calendar3 me-2 text-primary"></i>
                    Year-over-Year Comparison
                  </h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Total Incidents</th>
                          <th>Change</th>
                          <th>Clearance Rate</th>
                          <th>Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(crimeStatistics.yearlyData).map(([year, data], idx, arr) => (
                          <tr key={year}>
                            <td className="fw-bold">{year}</td>
                            <td>{data.total.toLocaleString()}</td>
                            <td>
                              {idx < arr.length - 1 && (
                                <span className={`badge bg-${data.total < arr[idx+1].total ? 'success' : 'danger'}`}>
                                  {((data.total - arr[idx+1].total)/arr[idx+1].total * 100).toFixed(1)}%
                                </span>
                              )}
                            </td>
                            <td>{data.clearance}%</td>
                            <td>
                              <i className={`bi bi-arrow-${data.total < (arr[idx-1]?.total || 0) ? 'down' : 'up'} text-${data.total < (arr[idx-1]?.total || 0) ? 'success' : 'danger'}`}></i>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0">
                    <i className="bi bi-weapon me-2 text-primary"></i>
                    Weapon Analysis
                  </h5>
                </div>
                <div className="card-body">
                  {crimeStatistics.weaponAnalysis.map((weapon, idx) => (
                    <div key={idx} className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span>{weapon.type}</span>
                        <div>
                          <span className="badge bg-secondary me-2">{weapon.count}</span>
                          <span className="text-muted">{weapon.percentage}%</span>
                          <span className={`ms-2 text-${weapon.trend > 0 ? 'danger' : 'success'}`}>
                            <small>({weapon.trend > 0 ? '+' : ''}{weapon.trend}%)</small>
                          </span>
                        </div>
                      </div>
                      <div className="progress" style={{ height: '4px' }}>
                        <div 
                          className="progress-bar bg-danger" 
                          style={{ width: `${weapon.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trends View */}
        {viewMode === 'trends' && (
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0">
                    <i className="bi bi-calendar-week me-2 text-primary"></i>
                    Daily Trends
                  </h5>
                </div>
                <div className="card-body">
                  {crimeStatistics.timeAnalysis.daily.map((day, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="d-flex justify-content-between">
                        <span>{day.day}</span>
                        <span className="fw-bold">{day.count} ({day.percentage}%)</span>
                      </div>
                      <div className="progress" style={{ height: '4px' }}>
                        <div 
                          className="progress-bar bg-info" 
                          style={{ width: `${day.percentage * 4}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0">
                    <i className="bi bi-calendar-month me-2 text-primary"></i>
                    Monthly Trends {selectedYear}
                  </h5>
                </div>
                <div className="card-body">
                  {crimeStatistics.timeAnalysis.monthly.map((month, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="d-flex justify-content-between">
                        <span>{month.month}</span>
                        <span className="fw-bold">{month.count} ({month.percentage}%)</span>
                      </div>
                      <div className="progress" style={{ height: '4px' }}>
                        <div 
                          className="progress-bar bg-primary" 
                          style={{ width: `${month.percentage * 4}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recovery Stats */}
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0">
                    <i className="bi bi-box-seam me-2 text-success"></i>
                    Property Recovery Statistics
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-3">
                      <div className="text-center p-3 border rounded">
                        <h3 className="text-success">{crimeStatistics.recoveryStats.itemsRecovered}</h3>
                        <small className="text-muted">Items Recovered</small>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center p-3 border rounded">
                        <h3 className="text-primary">{crimeStatistics.recoveryStats.recoveryRate}%</h3>
                        <small className="text-muted">Recovery Rate</small>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center p-3 border rounded">
                        <h3 className="text-warning">${(crimeStatistics.recoveryStats.totalValue/1000000).toFixed(1)}M</h3>
                        <small className="text-muted">Total Value</small>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center p-3 border rounded">
                        <h3 className="text-info">{crimeStatistics.recoveryStats.averageRecoveryTime}h</h3>
                        <small className="text-muted">Avg Recovery Time</small>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h6 className="mb-3">Recovery by Category</h6>
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Recovered</th>
                            <th>Recovery Rate</th>
                            <th>Avg Time (hrs)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {crimeStatistics.recoveryStats.byCategory.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.category}</td>
                              <td className="fw-bold">{item.recovered}</td>
                              <td>
                                <span className="badge bg-success">{item.percentage}%</span>
                              </td>
                              <td>{item.avgTime}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with data source */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="bg-light p-3 rounded d-flex justify-content-between align-items-center">
              <div>
                <i className="bi bi-info-circle me-2 text-primary"></i>
                <small className="text-muted">
                  Data source: Zimbabwe Republic Police Statistics Bureau | Last updated: March 15, 2026
                </small>
              </div>
              <div>
                <span className="badge bg-primary me-2">Confidence: 95%</span>
                <span className="badge bg-secondary">Sample size: 15,423 cases</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bootstrap Icons */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
    </div>
  );
}

export default Statistics;