// function Analytics() {
//   return (
//     <div className="analytics-container">
//       <h2 className="text-center">Analytics</h2>
//       <p className="text-center">This section is under construction. Please check back later for updates.</p>
//     </div>
//     );
// }

import { useState, useEffect } from 'react';

function Analytics() {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedChart, setSelectedChart] = useState('trends');
  const [analyticsData, setAnalyticsData] = useState({
    crimeStats: {
      totalReports: 1247,
      activeCases: 892,
      resolvedCases: 355,
      clearanceRate: 28.5
    },
    crimeTypes: [
      { type: 'Theft', count: 423, percentage: 34, trend: '+5%', color: '#3498db' },
      { type: 'Burglary', count: 287, percentage: 23, trend: '-2%', color: '#e74c3c' },
      { type: 'Assault', count: 156, percentage: 12.5, trend: '+8%', color: '#f39c12' },
      { type: 'Robbery', count: 198, percentage: 15.9, trend: '+12%', color: '#9b59b6' },
      { type: 'Fraud', count: 89, percentage: 7.1, trend: '-5%', color: '#1abc9c' },
      { type: 'Vehicle Theft', count: 67, percentage: 5.4, trend: '-3%', color: '#e67e22' },
      { type: 'Other', count: 27, percentage: 2.2, trend: '+1%', color: '#95a5a6' }
    ],
    trends: [
      { month: 'Jan', reports: 98, resolved: 24 },
      { month: 'Feb', reports: 112, resolved: 31 },
      { month: 'Mar', reports: 105, resolved: 28 },
      { month: 'Apr', reports: 124, resolved: 35 },
      { month: 'May', reports: 118, resolved: 32 },
      { month: 'Jun', reports: 132, resolved: 38 },
      { month: 'Jul', reports: 145, resolved: 42 },
      { month: 'Aug', reports: 138, resolved: 39 },
      { month: 'Sep', reports: 121, resolved: 34 },
      { month: 'Oct', reports: 108, resolved: 29 },
      { month: 'Nov', reports: 98, resolved: 26 },
      { month: 'Dec', reports: 89, resolved: 23 }
    ],
    hotspots: [
      { area: 'Central Business District', incidents: 234, risk: 'High', lat: -17.8292, lng: 31.0522 },
      { area: 'Mbare', incidents: 187, risk: 'High', lat: -17.8450, lng: 31.0333 },
      { area: 'Harare North', incidents: 145, risk: 'Medium', lat: -17.7950, lng: 31.0522 },
      { area: 'Borrowdale', incidents: 98, risk: 'Low', lat: -17.7550, lng: 31.0922 },
      { area: 'Msasa', incidents: 87, risk: 'Low', lat: -17.8450, lng: 31.1222 },
      { area: 'Belvedere', incidents: 76, risk: 'Low', lat: -17.8150, lng: 31.0222 }
    ],
    responseTimes: {
      average: '18.5 min',
      critical: '8.2 min',
      nonCritical: '24.7 min',
      byArea: [
        { area: 'CBD', time: '12 min' },
        { area: 'Mbare', time: '15 min' },
        { area: 'Borrowdale', time: '22 min' },
        { area: 'Msasa', time: '19 min' }
      ]
    },
    officers: {
      active: 42,
      onDuty: 28,
      offDuty: 14,
      performance: [
        { name: 'Officer Makoni', cases: 45, resolved: 38, rating: 4.8 },
        { name: 'Officer Sibanda', cases: 52, resolved: 41, rating: 4.5 },
        { name: 'Officer Dube', cases: 38, resolved: 32, rating: 4.9 },
        { name: 'Officer Moyo', cases: 41, resolved: 33, rating: 4.6 }
      ]
    }
  });

  const [loading, setLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);

  // Simulate data refresh
  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  // Simple bar chart component
  const BarChart = ({ data, height = 200 }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="d-flex align-items-end justify-content-between" style={{ height: `${height}px` }}>
        {data.map((item, index) => (
          <div key={index} className="text-center" style={{ width: '60px' }}>
            <div 
              className="bg-primary rounded-top"
              style={{ 
                height: `${(item.value / maxValue) * (height - 40)}px`,
                minHeight: '20px',
                transition: 'height 0.3s ease'
              }}
            >
              <small className="text-white fw-bold">{item.value}</small>
            </div>
            <small className="text-muted mt-2 d-block">{item.label}</small>
          </div>
        ))}
      </div>
    );
  };

  // Simple pie chart component (using CSS circles)
  const PieChart = ({ data, size = 200 }) => {
    let cumulativePercentage = 0;
    
    return (
      <div className="position-relative" style={{ width: size, height: size }}>
        <div className="position-absolute w-100 h-100">
          {data.map((item, index) => {
            const percentage = item.percentage;
            const startAngle = cumulativePercentage * 3.6;
            const endAngle = (cumulativePercentage + percentage) * 3.6;
            cumulativePercentage += percentage;
            
            return (
              <div
                key={index}
                className="position-absolute w-100 h-100"
                style={{
                  background: `conic-gradient(transparent ${startAngle}deg, ${item.color} ${startAngle}deg ${endAngle}deg, transparent ${endAngle}deg)`,
                  borderRadius: '50%'
                }}
                title={`${item.type}: ${percentage}%`}
              />
            );
          })}
        </div>
        <div className="position-absolute top-50 start-50 translate-middle text-center">
          <h3 className="mb-0">{analyticsData.crimeStats.totalReports}</h3>
          <small>Total Cases</small>
        </div>
      </div>
    );
  };

  // KPI Card Component
  const KPICard = ({ title, value, subtitle, icon, color, trend }) => (
    <div className="card shadow-sm h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h6 className="text-muted mb-2">{title}</h6>
            <h2 className={`mb-1 text-${color}`}>{value}</h2>
            {subtitle && <small className="text-muted">{subtitle}</small>}
            {trend && (
              <div className={`mt-2 badge bg-${trend.startsWith('+') ? 'success' : 'danger'}`}>
                {trend}
              </div>
            )}
          </div>
          <div className={`bg-${color} bg-opacity-10 p-3 rounded`}>
            <i className={`bi bi-${icon} text-${color} fs-4`}></i>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">
        {/* Header */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom">
            <div className='my-0'>
                <h1 className="display-6 fw-bold" style={{ color: '#2c3e50' }}>
                  <i className="bi bi-graph-up me-3 text-primary"></i>
                  Crime Analytics Dashboard
                </h1>
                {/* <p className="text-muted">Real-time crime statistics and insights for Harare Metropolitan</p> */}
            </div>
            <div className="user-profile py-2 px-0 ">
                <span className="badge bg-primary text-dark rounded-2">Admin User</span>
            </div>
        </header>
        <div className="row mb-2 mt-2">
          <div className="col-12">
            <div className="d-flex justify-content-end align-items-center">
              <div className="d-flex gap-2">
                <div className="btn-group" role="group">
                  <button 
                    className={`btn btn-outline-primary ${timeRange === 'week' ? 'active' : ''}`}
                    onClick={() => setTimeRange('week')}
                  >
                    Week
                  </button>
                  <button 
                    className={`btn btn-outline-primary ${timeRange === 'month' ? 'active' : ''}`}
                    onClick={() => setTimeRange('month')}
                  >
                    Month
                  </button>
                  <button 
                    className={`btn btn-outline-primary ${timeRange === 'year' ? 'active' : ''}`}
                    onClick={() => setTimeRange('year')}
                  >
                    Year
                  </button>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={refreshData}
                  disabled={loading}
                >
                  <i className={`bi ${loading ? 'bi-arrow-repeat spin' : 'bi-arrow-repeat'}`}></i>
                  {loading ? ' Refreshing...' : ' Refresh Data'}
                </button>
                <button className="btn btn-outline-secondary">
                  <i className="bi bi-download"></i> Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <KPICard 
              title="Total Reports" 
              value={analyticsData.crimeStats.totalReports}
              subtitle="Last 30 days"
              icon="file-text"
              color="primary"
              trend="+12%"
            />
          </div>
          <div className="col-md-3">
            <KPICard 
              title="Active Cases" 
              value={analyticsData.crimeStats.activeCases}
              subtitle="Under investigation"
              icon="briefcase"
              color="warning"
            />
          </div>
          <div className="col-md-3">
            <KPICard 
              title="Resolved Cases" 
              value={analyticsData.crimeStats.resolvedCases}
              subtitle="Successfully closed"
              icon="check-circle"
              color="success"
            />
          </div>
          <div className="col-md-3">
            <KPICard 
              title="Clearance Rate" 
              value={`${analyticsData.crimeStats.clearanceRate}%`}
              subtitle="Cases solved"
              icon="percent"
              color="info"
              trend="+2.5%"
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className="row g-4 mb-4">
          {/* Crime Types Distribution */}
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-pie-chart me-2 text-primary"></i>
                  Crime Type Distribution
                </h5>
                <span className="badge bg-primary">{timeRange}</span>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 d-flex justify-content-center">
                    <PieChart data={analyticsData.crimeTypes} size={200} />
                  </div>
                  <div className="col-md-6">
                    <div className="list-group list-group-flush">
                      {analyticsData.crimeTypes.map((crime, index) => (
                        <div key={index} className="list-group-item px-0">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <span className="badge me-2" style={{ backgroundColor: crime.color }}>&nbsp;</span>
                              <span>{crime.type}</span>
                            </div>
                            <div>
                              <strong>{crime.count}</strong>
                              <small className="text-muted ms-2">({crime.percentage}%)</small>
                              <span className={`ms-2 text-${crime.trend.startsWith('+') ? 'success' : 'danger'}`}>
                                {crime.trend}
                              </span>
                            </div>
                          </div>
                          <div className="progress mt-1" style={{ height: '4px' }}>
                            <div 
                              className="progress-bar" 
                              style={{ 
                                width: `${crime.percentage}%`,
                                backgroundColor: crime.color 
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-graph-up me-2 text-primary"></i>
                  Monthly Crime Trends
                </h5>
                <div className="btn-group btn-group-sm">
                  <button 
                    className={`btn ${selectedChart === 'trends' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedChart('trends')}
                  >
                    Trends
                  </button>
                  <button 
                    className={`btn ${selectedChart === 'comparison' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedChart('comparison')}
                  >
                    Comparison
                  </button>
                </div>
              </div>
              <div className="card-body">
                <BarChart 
                  data={analyticsData.trends.map(t => ({ label: t.month, value: t.reports }))}
                  height={250}
                />
                <div className="mt-3 d-flex justify-content-center gap-4">
                  <div>
                    <span className="badge bg-primary">&nbsp;</span>
                    <small className="ms-2">Reports</small>
                  </div>
                  <div>
                    <span className="badge bg-success">&nbsp;</span>
                    <small className="ms-2">Resolved</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="row g-4 mb-4">
          {/* Crime Hotspots */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="mb-0">
                  <i className="bi bi-map me-2 text-primary"></i>
                  Crime Hotspots
                </h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Area</th>
                        <th>Incidents</th>
                        <th>Risk Level</th>
                        <th>Response Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.hotspots.map((spot, index) => (
                        <tr 
                          key={index} 
                          onClick={() => setSelectedArea(spot)}
                          style={{ cursor: 'pointer' }}
                          className={selectedArea === spot ? 'table-primary' : ''}
                        >
                          <td>
                            <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                            {spot.area}
                          </td>
                          <td><strong>{spot.incidents}</strong></td>
                          <td>
                            <span className={`badge bg-${spot.risk === 'High' ? 'danger' : spot.risk === 'Medium' ? 'warning' : 'success'}`}>
                              {spot.risk}
                            </span>
                          </td>
                          <td>{analyticsData.responseTimes.byArea.find(a => a.area === spot.area)?.time || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 p-3 bg-light rounded">
                  <div className="d-flex justify-content-between">
                    <div>
                      <small className="text-muted d-block">Average Response Time</small>
                      <strong>{analyticsData.responseTimes.average}</strong>
                    </div>
                    <div>
                      <small className="text-muted d-block">Critical Cases</small>
                      <strong className="text-danger">{analyticsData.responseTimes.critical}</strong>
                    </div>
                    <div>
                      <small className="text-muted d-block">Non-Critical</small>
                      <strong>{analyticsData.responseTimes.nonCritical}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Officer Performance */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-person-badge me-2 text-primary"></i>
                  Officer Performance
                </h5>
                <div>
                  <span className="badge bg-success me-2">{analyticsData.officers.onDuty} On Duty</span>
                  <span className="badge bg-secondary">{analyticsData.officers.offDuty} Off Duty</span>
                </div>
              </div>
              <div className="card-body">
                {analyticsData.officers.performance.map((officer, index) => (
                  <div key={index} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{officer.name}</strong>
                        <div className="text-muted small">
                          <span className="me-2">{officer.cases} cases</span>
                          <span className="text-success">{officer.resolved} resolved</span>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            {[...Array(5)].map((_, i) => (
                              <i 
                                key={i} 
                                className={`bi bi-star-fill ${i < Math.floor(officer.rating) ? 'text-warning' : 'text-muted'}`}
                                style={{ fontSize: '0.8rem' }}
                              ></i>
                            ))}
                          </div>
                          <span className="badge bg-primary">{officer.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="progress mt-1" style={{ height: '4px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${(officer.resolved / officer.cases) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                <button className="btn btn-outline-primary btn-sm w-100 mt-2">
                  <i className="bi bi-people me-2"></i>
                  View All Officers
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Insights Row */}
        <div className="row g-4">
          {/* Predictive Analytics */}
          <div className="col-md-4">
            <div className="card shadow-sm bg-primary text-white">
              <div className="card-body">
                <h5 className="mb-3">
                  <i className="bi bi-robot me-2"></i>
                  AI Predictions
                </h5>
                <p className="small opacity-75">Next 7 days forecast</p>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Expected incidents</span>
                    <strong>156</strong>
                  </div>
                  <div className="progress mt-1" style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.3)' }}>
                    <div className="progress-bar bg-white" style={{ width: '75%' }} />
                  </div>
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>Peak time</span>
                    <strong>18:00 - 22:00</strong>
                  </div>
                </div>
                <div>
                  <div className="d-flex justify-content-between">
                    <span>High risk areas</span>
                    <strong>3 locations</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recovery Stats */}
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">
                  <i className="bi bi-box-seam me-2 text-success"></i>
                  Property Recovery Stats
                </h5>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="border rounded p-3 text-center">
                      <h3 className="text-success mb-0">234</h3>
                      <small className="text-muted">Items Recovered</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border rounded p-3 text-center">
                      <h3 className="text-warning mb-0">$1.2M</h3>
                      <small className="text-muted">Value Recovered</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border rounded p-3 text-center">
                      <h3 className="text-primary mb-0">45%</h3>
                      <small className="text-muted">Recovery Rate</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border rounded p-3 text-center">
                      <h3 className="text-info mb-0">3.2d</h3>
                      <small className="text-muted">Avg. Recovery Time</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">
                  <i className="bi bi-activity me-2 text-warning"></i>
                  Recent Activity
                </h5>
                <div className="timeline">
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <i className="bi bi-plus-circle-fill text-success"></i>
                    </div>
                    <div>
                      <small className="text-muted">5 min ago</small>
                      <p className="mb-0">New case reported in Mbare</p>
                    </div>
                  </div>
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <i className="bi bi-check-circle-fill text-primary"></i>
                    </div>
                    <div>
                      <small className="text-muted">15 min ago</small>
                      <p className="mb-0">Case #1234 resolved - Property recovered</p>
                    </div>
                  </div>
                  <div className="d-flex">
                    <div className="me-3">
                      <i className="bi bi-exclamation-triangle-fill text-warning"></i>
                    </div>
                    <div>
                      <small className="text-muted">32 min ago</small>
                      <p className="mb-0">Alert: Suspicious activity in CBD</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Bootstrap Icons */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />

      {/* Add spinning animation for refresh */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default Analytics;