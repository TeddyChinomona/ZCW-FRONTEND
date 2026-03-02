// function Reports() {
//     return (
//         <div class="reports-container">
//             <h2 class="text-center">Reports</h2>
//             <p class="text-center">This section is under construction. Please check back later for updates.</p>
//         </div>
//     );
// }

// export default Reports;

import { useState, useMemo } from 'react';
import Logo from '/logo.jpg'

function Reports() {
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedReportType, setSelectedReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({
    startDate: '2026-03-01',
    endDate: '2026-03-31'
  });
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [savedReports, setSavedReports] = useState([
    {
      id: 1,
      name: 'Daily Crime Summary',
      type: 'daily',
      date: '2026-03-20',
      format: 'PDF',
      size: '1.2 MB',
      pages: 5,
      region: 'Harare Central'
    },
    {
      id: 2,
      name: 'Monthly Statistical Report',
      type: 'monthly',
      date: '2026-03-01',
      format: 'PDF',
      size: '3.5 MB',
      pages: 15,
      region: 'All Regions'
    },
    {
      id: 3,
      name: 'Crime Analysis Q1 2026',
      type: 'quarterly',
      date: '2026-01-15',
      format: 'Excel',
      size: '2.1 MB',
      pages: 25,
      region: 'National'
    },
    {
      id: 4,
      name: 'Property Recovery Report',
      type: 'recovery',
      date: '2026-03-18',
      format: 'PDF',
      size: '1.8 MB',
      pages: 8,
      region: 'Bulawayo'
    },
    {
      id: 5,
      name: 'Officer Performance Review',
      type: 'performance',
      date: '2026-03-15',
      format: 'Word',
      size: '2.4 MB',
      pages: 12,
      region: 'Harare Metropolitan'
    }
  ]);

  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: 'Standard Crime Report',
      category: 'General',
      description: 'Basic crime incident report template',
      uses: 234,
      lastUsed: '2026-03-19'
    },
    {
      id: 2,
      name: 'Detailed Investigation Report',
      category: 'Investigation',
      description: 'Comprehensive case investigation template',
      uses: 156,
      lastUsed: '2026-03-20'
    },
    {
      id: 3,
      name: 'Monthly Crime Statistics',
      category: 'Statistics',
      description: 'Statistical analysis with charts and graphs',
      uses: 89,
      lastUsed: '2026-03-18'
    },
    {
      id: 4,
      name: 'Property Recovery Summary',
      category: 'Recovery',
      description: 'Detailed property recovery report',
      uses: 67,
      lastUsed: '2026-03-17'
    },
    {
      id: 5,
      name: 'Officer Activity Log',
      category: 'Performance',
      description: 'Daily officer activity and case assignments',
      uses: 145,
      lastUsed: '2026-03-20'
    }
  ]);

  const reportTypes = [
    { value: 'daily', label: 'Daily Crime Summary', icon: 'calendar-day' },
    { value: 'weekly', label: 'Weekly Statistical Report', icon: 'calendar-week' },
    { value: 'monthly', label: 'Monthly Analysis Report', icon: 'calendar-month' },
    { value: 'quarterly', label: 'Quarterly Review', icon: 'calendar3' },
    { value: 'annual', label: 'Annual Crime Report', icon: 'calendar2-check' },
    { value: 'case', label: 'Case Investigation Report', icon: 'briefcase' },
    { value: 'recovery', label: 'Property Recovery Report', icon: 'box-seam' },
    { value: 'performance', label: 'Officer Performance Report', icon: 'person-badge' },
    { value: 'statistical', label: 'Statistical Analysis', icon: 'bar-chart' },
    { value: 'custom', label: 'Custom Report', icon: 'gear' }
  ];

  const regions = [
    'All Regions',
    'Harare Central',
    'Bulawayo',
    'Manicaland',
    'Mashonaland West',
    'Mashonaland East',
    'Masvingo',
    'Matabeleland North',
    'Matabeleland South',
    'Midlands'
  ];

  // Filter saved reports based on search
  const filteredSavedReports = useMemo(() => {
    return savedReports.filter(report => 
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, savedReports]);

  // Handle report generation
  const handleGenerateReport = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setReportGenerated(true);
      
      // Add to saved reports
      const newReport = {
        id: savedReports.length + 1,
        name: `${reportTypes.find(r => r.value === selectedReportType)?.label || 'Report'} - ${new Date().toLocaleDateString()}`,
        type: selectedReportType,
        date: new Date().toISOString().split('T')[0],
        format: selectedFormat.toUpperCase(),
        size: selectedFormat === 'pdf' ? '1.5 MB' : selectedFormat === 'excel' ? '0.8 MB' : '0.5 MB',
        pages: selectedFormat === 'pdf' ? 12 : 8,
        region: selectedRegion === 'all' ? 'All Regions' : selectedRegion
      };
      
      setSavedReports([newReport, ...savedReports]);
    }, 3000);
  };

  // Handle report download
  const handleDownload = (report) => {
    alert(`Downloading ${report.name}...`);
  };

  // Handle report deletion
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      setSavedReports(savedReports.filter(report => report.id !== id));
    }
  };

  // Handle template use
  const handleUseTemplate = (template) => {
    setActiveTab('generate');
    setSelectedReportType('custom');
    alert(`Loading template: ${template.name}`);
  };

  // Report Type Card Component
  const ReportTypeCard = ({ type, selected, onSelect }) => (
    <div 
      className={`card mb-2 ${selected === type.value ? 'border-primary bg-primary bg-opacity-10' : ''}`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(type.value)}
    >
      <div className="card-body py-2">
        <div className="d-flex align-items-center">
          <div className={`me-3 ${selected === type.value ? 'text-primary' : 'text-muted'}`}>
            <i className={`bi bi-${type.icon} fs-4`}></i>
          </div>
          <div>
            <h6 className={`mb-0 ${selected === type.value ? 'text-primary fw-bold' : ''}`}>
              {type.label}
            </h6>
          </div>
          {selected === type.value && (
            <div className="ms-auto">
              <i className="bi bi-check-circle-fill text-primary"></i>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Report Preview Component
  const ReportPreview = () => (
    <div className="card shadow-sm">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-file-text me-2 text-primary"></i>
          Report Preview
        </h5>
        <div>
          <button className="btn btn-sm btn-outline-primary me-2">
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
          <button className="btn btn-sm btn-primary">
            <i className="bi bi-fullscreen"></i> Full Screen
          </button>
        </div>
      </div>
      <div className="card-body p-4" style={{ minHeight: '400px', backgroundColor: '#f8f9fa' }}>
        {reportGenerated ? (
          <div className="report-preview">
            {/* Report Header */}
            <div className="text-center mb-4">
              <img src={Logo} alt="ZRP Logo" className="mb-2" style={{ width: '60px' }} />
              <h4 className="fw-bold">ZIMBABWE REPUBLIC POLICE</h4>
              <h5>Crime Report - {reportTypes.find(r => r.value === selectedReportType)?.label}</h5>
              <p className="text-muted">
                Period: {dateRange.startDate} to {dateRange.endDate} | Region: {selectedRegion === 'all' ? 'All Regions' : selectedRegion}
              </p>
            </div>

            {/* Report Content */}
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card bg-primary text-white">
                  <div className="card-body text-center py-3">
                    <h6>Total Incidents</h6>
                    <h3>1,247</h3>
                    <small>+5.2% vs previous</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success text-white">
                  <div className="card-body text-center py-3">
                    <h6>Resolved Cases</h6>
                    <h3>892</h3>
                    <small>71.5% clearance</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-warning text-white">
                  <div className="card-body text-center py-3">
                    <h6>Active Cases</h6>
                    <h3>355</h3>
                    <small>28.5% pending</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-info text-white">
                  <div className="card-body text-center py-3">
                    <h6>Recoveries</h6>
                    <h3>$234K</h3>
                    <small>42% recovery rate</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Table */}
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h6 className="mb-0">Crime Category Summary</h6>
              </div>
              <div className="card-body p-0">
                <table className="table table-sm mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Category</th>
                      <th>Incidents</th>
                      <th>Percentage</th>
                      <th>Resolved</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Property Crime</td>
                      <td>678</td>
                      <td>54.4%</td>
                      <td>423</td>
                      <td><span className="badge bg-success">-2.1%</span></td>
                    </tr>
                    <tr>
                      <td>Violent Crime</td>
                      <td>345</td>
                      <td>27.7%</td>
                      <td>267</td>
                      <td><span className="badge bg-danger">+3.2%</span></td>
                    </tr>
                    <tr>
                      <td>Financial Crime</td>
                      <td>156</td>
                      <td>12.5%</td>
                      <td>134</td>
                      <td><span className="badge bg-danger">+5.2%</span></td>
                    </tr>
                    <tr>
                      <td>Drug Related</td>
                      <td>68</td>
                      <td>5.4%</td>
                      <td>68</td>
                      <td><span className="badge bg-success">-3.4%</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Report Footer */}
            <div className="text-muted small">
              <p>Report generated on: {new Date().toLocaleString()}</p>
              <p>Generated by: Officer J. Makoni (ID: ZRP-2345)</p>
              <p className="mb-0">Classification: OFFICIAL - SENSITIVE</p>
            </div>
          </div>
        ) : (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
            <i className="bi bi-file-earmark-text fs-1 mb-3"></i>
            <p>Select report parameters and click Generate to preview</p>
          </div>
        )}
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
                  <i className="bi bi-file-earmark-text me-3 text-primary"></i>
                  Reports Management
                </h1>
                {/* <p className="text-muted">Generate, manage, and export crime reports</p> */}
            </div>
            <div className="user-profile py-2 px-0 ">
                <span className="badge bg-primary text-dark rounded-2">Admin User</span>
            </div>
        </header>

        <div className="row mb-2 mt-2">
          <div className="col-12">
            <div className="d-flex justify-content-end align-items-center">
              <div className="d-flex gap-2">
                <button className="btn btn-outline-primary">
                  <i className="bi bi-archive"></i> Archive
                </button>
                <button className="btn btn-primary">
                  <i className="bi bi-plus-circle"></i> New Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="row mb-4">
          <div className="col-12">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'generate' ? 'active' : ''}`}
                  onClick={() => setActiveTab('generate')}
                >
                  <i className="bi bi-gear me-2"></i>
                  Generate Report
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'saved' ? 'active' : ''}`}
                  onClick={() => setActiveTab('saved')}
                >
                  <i className="bi bi-save me-2"></i>
                  Saved Reports
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'templates' ? 'active' : ''}`}
                  onClick={() => setActiveTab('templates')}
                >
                  <i className="bi bi-files me-2"></i>
                  Templates
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'scheduled' ? 'active' : ''}`}
                  onClick={() => setActiveTab('scheduled')}
                >
                  <i className="bi bi-clock me-2"></i>
                  Scheduled
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Generate Report Tab */}
        {activeTab === 'generate' && (
          <div className="row">
            {/* Report Configuration */}
            <div className="col-md-4">
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0">
                    <i className="bi bi-sliders2 me-2 text-primary"></i>
                    Report Configuration
                  </h5>
                </div>
                <div className="card-body">
                  {/* Report Type Selection */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">Report Type</label>
                    <div className="report-types-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {reportTypes.map(type => (
                        <ReportTypeCard 
                          key={type.value}
                          type={type}
                          selected={selectedReportType}
                          onSelect={setSelectedReportType}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">Date Range</label>
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="small text-muted">Start Date</label>
                        <input 
                          type="date" 
                          className="form-control"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                        />
                      </div>
                      <div className="col-6">
                        <label className="small text-muted">End Date</label>
                        <input 
                          type="date" 
                          className="form-control"
                          value={dateRange.endDate}
                          onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Region Selection */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">Region</label>
                    <select 
                      className="form-select"
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                    >
                      {regions.map(region => (
                        <option key={region} value={region.toLowerCase().replace(' ', '-')}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Format Selection */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">Export Format</label>
                    <div className="d-flex gap-2">
                      <div 
                        className={`flex-fill text-center p-2 border rounded ${selectedFormat === 'pdf' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedFormat('pdf')}
                      >
                        <i className={`bi bi-file-pdf fs-4 ${selectedFormat === 'pdf' ? 'text-primary' : 'text-muted'}`}></i>
                        <small className="d-block">PDF</small>
                      </div>
                      <div 
                        className={`flex-fill text-center p-2 border rounded ${selectedFormat === 'excel' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedFormat('excel')}
                      >
                        <i className={`bi bi-file-excel fs-4 ${selectedFormat === 'excel' ? 'text-primary' : 'text-muted'}`}></i>
                        <small className="d-block">Excel</small>
                      </div>
                      <div 
                        className={`flex-fill text-center p-2 border rounded ${selectedFormat === 'word' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedFormat('word')}
                      >
                        <i className={`bi bi-file-word fs-4 ${selectedFormat === 'word' ? 'text-primary' : 'text-muted'}`}></i>
                        <small className="d-block">Word</small>
                      </div>
                      <div 
                        className={`flex-fill text-center p-2 border rounded ${selectedFormat === 'csv' ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedFormat('csv')}
                      >
                        <i className={`bi bi-file-spreadsheet fs-4 ${selectedFormat === 'csv' ? 'text-primary' : 'text-muted'}`}></i>
                        <small className="d-block">CSV</small>
                      </div>
                    </div>
                  </div>

                  {/* Additional Options */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">Additional Options</label>
                    <div className="form-check mb-2">
                      <input className="form-check-input" type="checkbox" id="includeCharts" defaultChecked />
                      <label className="form-check-label" htmlFor="includeCharts">
                        Include charts and graphs
                      </label>
                    </div>
                    <div className="form-check mb-2">
                      <input className="form-check-input" type="checkbox" id="includeSummary" defaultChecked />
                      <label className="form-check-label" htmlFor="includeSummary">
                        Include executive summary
                      </label>
                    </div>
                    <div className="form-check mb-2">
                      <input className="form-check-input" type="checkbox" id="includeAppendix" />
                      <label className="form-check-label" htmlFor="includeAppendix">
                        Include data appendix
                      </label>
                    </div>
                    <div className="form-check mb-2">
                      <input className="form-check-input" type="checkbox" id="passwordProtect" />
                      <label className="form-check-label" htmlFor="passwordProtect">
                        Password protect document
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="d-grid gap-2">
                    <button 
                      className="btn btn-primary" 
                      onClick={handleGenerateReport}
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-file-earmark-arrow-up me-2"></i>
                          Generate Report
                        </>
                      )}
                    </button>
                    <button className="btn btn-outline-secondary">
                      <i className="bi bi-save me-2"></i>
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Report Preview */}
            <div className="col-md-8">
              <ReportPreview />
            </div>
          </div>
        )}

        {/* Saved Reports Tab */}
        {activeTab === 'saved' && (
          <div className="row">
            <div className="col-12">
              {/* Search and Filter */}
              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-search"></i>
                        </span>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Search reports..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <select className="form-select">
                        <option value="all">All Types</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select className="form-select">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="name">Name A-Z</option>
                        <option value="size">Size</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <button className="btn btn-outline-primary w-100">
                        <i className="bi bi-funnel"></i> Filter
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reports Grid */}
              <div className="row g-4">
                {filteredSavedReports.map(report => (
                  <div key={report.id} className="col-md-4">
                    <div className="card shadow-sm h-100">
                      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                        <div>
                          <span className={`badge bg-${report.format === 'PDF' ? 'danger' : report.format === 'Excel' ? 'success' : 'primary'} me-2`}>
                            {report.format}
                          </span>
                          <small className="text-muted">{report.size}</small>
                        </div>
                        <div className="dropdown">
                          <button className="btn btn-sm btn-link" data-bs-toggle="dropdown">
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li><button className="dropdown-item" onClick={() => handleDownload(report)}>
                              <i className="bi bi-download me-2"></i> Download
                            </button></li>
                            <li><button className="dropdown-item">
                              <i className="bi bi-envelope me-2"></i> Email
                            </button></li>
                            <li><button className="dropdown-item">
                              <i className="bi bi-share me-2"></i> Share
                            </button></li>
                            <li><hr className="dropdown-divider" /></li>
                            <li><button className="dropdown-item text-danger" onClick={() => handleDelete(report.id)}>
                              <i className="bi bi-trash me-2"></i> Delete
                            </button></li>
                          </ul>
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="d-flex align-items-start mb-3">
                          <div className="me-3">
                            <i className={`bi bi-file-${report.format === 'PDF' ? 'pdf' : report.format === 'Excel' ? 'excel' : 'word'} text-${report.format === 'PDF' ? 'danger' : report.format === 'Excel' ? 'success' : 'primary'} fs-2`}></i>
                          </div>
                          <div>
                            <h6 className="fw-bold mb-1">{report.name}</h6>
                            <p className="small text-muted mb-1">
                              <i className="bi bi-calendar me-1"></i> {report.date}
                            </p>
                            <p className="small text-muted mb-0">
                              <i className="bi bi-geo-alt me-1"></i> {report.region}
                            </p>
                          </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            <i className="bi bi-file-text me-1"></i> {report.pages} pages
                          </small>
                          <button className="btn btn-sm btn-primary" onClick={() => handleDownload(report)}>
                            <i className="bi bi-download"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="d-flex justify-content-center mt-4">
                <nav>
                  <ul className="pagination">
                    <li className="page-item disabled">
                      <a className="page-link" href="#">Previous</a>
                    </li>
                    <li className="page-item active"><a className="page-link" href="#">1</a></li>
                    <li className="page-item"><a className="page-link" href="#">2</a></li>
                    <li className="page-item"><a className="page-link" href="#">3</a></li>
                    <li className="page-item"><a className="page-link" href="#">Next</a></li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="row">
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="bi bi-files me-2 text-primary"></i>
                    Report Templates
                  </h5>
                  <button className="btn btn-primary btn-sm">
                    <i className="bi bi-plus-circle"></i> Create Template
                  </button>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    {templates.map(template => (
                      <div key={template.id} className="col-md-6 col-lg-4">
                        <div className="card h-100 border-0 shadow-sm">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div>
                                <span className="badge bg-info mb-2">{template.category}</span>
                                <h6 className="fw-bold mb-1">{template.name}</h6>
                                <p className="small text-muted mb-2">{template.description}</p>
                              </div>
                              <i className="bi bi-file-text text-primary fs-2"></i>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <small className="text-muted d-block">
                                  <i className="bi bi-people me-1"></i> Used {template.uses} times
                                </small>
                                <small className="text-muted">
                                  <i className="bi bi-clock me-1"></i> Last: {template.lastUsed}
                                </small>
                              </div>
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleUseTemplate(template)}
                              >
                                Use Template
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Reports Tab */}
        {activeTab === 'scheduled' && (
          <div className="row">
            <div className="col-md-8">
              <div className="card shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="bi bi-clock-history me-2 text-primary"></i>
                    Scheduled Reports
                  </h5>
                  <button className="btn btn-primary btn-sm">
                    <i className="bi bi-plus-circle"></i> Schedule New
                  </button>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Report Name</th>
                          <th>Frequency</th>
                          <th>Next Run</th>
                          <th>Recipients</th>
                          <th>Format</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="fw-bold">Daily Crime Summary</td>
                          <td>Daily at 06:00</td>
                          <td>Tomorrow, 06:00</td>
                          <td>5 recipients</td>
                          <td><span className="badge bg-danger">PDF</span></td>
                          <td>
                            <button className="btn btn-sm btn-link">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-link text-danger">
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Weekly Statistics</td>
                          <td>Every Monday</td>
                          <td>Mar 23, 2026</td>
                          <td>8 recipients</td>
                          <td><span className="badge bg-success">Excel</span></td>
                          <td>
                            <button className="btn btn-sm btn-link">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-link text-danger">
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Monthly Performance</td>
                          <td>1st of Month</td>
                          <td>Apr 1, 2026</td>
                          <td>12 recipients</td>
                          <td><span className="badge bg-primary">Word</span></td>
                          <td>
                            <button className="btn btn-sm btn-link">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-link text-danger">
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Summary */}
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0">
                    <i className="bi bi-pie-chart me-2 text-primary"></i>
                    Schedule Summary
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Active Schedules</span>
                      <span className="fw-bold">8</span>
                    </div>
                    <div className="progress" style={{ height: '4px' }}>
                      <div className="progress-bar bg-success" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Daily Reports</span>
                      <span className="fw-bold">3</span>
                    </div>
                    <div className="progress" style={{ height: '4px' }}>
                      <div className="progress-bar bg-info" style={{ width: '38%' }}></div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Weekly Reports</span>
                      <span className="fw-bold">2</span>
                    </div>
                    <div className="progress" style={{ height: '4px' }}>
                      <div className="progress-bar bg-primary" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Monthly Reports</span>
                      <span className="fw-bold">3</span>
                    </div>
                    <div className="progress" style={{ height: '4px' }}>
                      <div className="progress-bar bg-warning" style={{ width: '38%' }}></div>
                    </div>
                  </div>
                  <hr />
                  <div className="text-center">
                    <h6>Next Report Generation</h6>
                    <h3 className="text-primary">06:00 AM</h3>
                    <small className="text-muted">Daily Crime Summary</small>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card shadow-sm mt-4">
                <div className="card-body">
                  <h6 className="mb-3">Quick Actions</h6>
                  <div className="d-grid gap-2">
                    <button className="btn btn-outline-primary btn-sm">
                      <i className="bi bi-clock me-2"></i>
                      Pause All Schedules
                    </button>
                    <button className="btn btn-outline-secondary btn-sm">
                      <i className="bi bi-envelope me-2"></i>
                      Update Recipients
                    </button>
                    <button className="btn btn-outline-success btn-sm">
                      <i className="bi bi-play me-2"></i>
                      Run Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bootstrap Icons */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
    </div>
  );
}

export default Reports;