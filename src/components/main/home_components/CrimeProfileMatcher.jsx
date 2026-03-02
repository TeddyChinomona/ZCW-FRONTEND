import { useState, useMemo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function CrimeProfileMatcher() {
  const [activeTab, setActiveTab] = useState('suspect');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchThreshold, setMatchThreshold] = useState(75);
  const [selectedFilters, setSelectedFilters] = useState({
    crimeType: 'all',
    location: 'all',
    timeframe: 'all'
  });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('basic');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mock suspect profiles database
  const suspectProfiles = [
    {
      id: 'S-2024-001',
      name: 'John Doe',
      alias: 'JD',
      age: 34,
      gender: 'Male',
      nationality: 'Zimbabwean',
      idNumber: '63-1234567A-12',
      address: '123 Mbare, Harare',
      phone: '+263 77 123 4567',
      physicalFeatures: [
        'Tall (6\'2")',
        'Scar on left cheek',
        'Tattoo of eagle on right arm',
        'Bald head'
      ],
      knownAssociates: ['Peter Smith', 'James Brown'],
      previousConvictions: [
        { crime: 'Burglary', year: 2019, sentence: '2 years' },
        { crime: 'Theft', year: 2021, sentence: '1 year' }
      ],
      modusOperandi: ['Forced entry', 'Night time', 'Avoids alarms'],
      fingerprints: 'AFIS-23456',
      dnaProfile: 'DNA-789012',
      riskLevel: 'High',
      lastSeen: '2026-03-15',
      activeWarrant: true
    },
    {
      id: 'S-2024-045',
      name: 'Jane Smith',
      alias: 'JS',
      age: 28,
      gender: 'Female',
      nationality: 'Zimbabwean',
      idNumber: '63-2345678B-23',
      address: '456 Highfield, Harare',
      phone: '+263 78 234 5678',
      physicalFeatures: [
        'Medium height (5\'6")',
        'Birthmark on neck',
        'Long black hair',
        'Gold tooth'
      ],
      knownAssociates: ['Mary Johnson', 'Tom Dube'],
      previousConvictions: [
        { crime: 'Fraud', year: 2020, sentence: '18 months' },
        { crime: 'Identity Theft', year: 2022, sentence: 'Pending' }
      ],
      modusOperandi: ['Financial scams', 'Online fraud', 'Identity theft'],
      fingerprints: 'AFIS-34567',
      dnaProfile: 'DNA-890123',
      riskLevel: 'Medium',
      lastSeen: '2026-03-18',
      activeWarrant: true
    },
    {
      id: 'S-2024-089',
      name: 'Tendai Moyo',
      alias: 'TM',
      age: 42,
      gender: 'Male',
      nationality: 'Zimbabwean',
      idNumber: '63-3456789C-34',
      address: '789 Mabelreign, Harare',
      phone: '+263 71 345 6789',
      physicalFeatures: [
        'Stocky build',
        'Glasses',
        'Grey hair',
        'Missing left ear'
      ],
      knownAssociates: ['Patrick Ndlovu'],
      previousConvictions: [
        { crime: 'Armed Robbery', year: 2015, sentence: '5 years' },
        { crime: 'Carjacking', year: 2023, sentence: 'Under investigation' }
      ],
      modusOperandi: ['Armed robbery', 'Targets banks', 'Uses getaway driver'],
      fingerprints: 'AFIS-45678',
      dnaProfile: 'DNA-901234',
      riskLevel: 'Critical',
      lastSeen: '2026-03-20',
      activeWarrant: true
    }
  ];

  // Mock crime cases database
  const crimeCases = [
    {
      id: 'C-2026-123',
      type: 'Burglary',
      date: '2026-03-15',
      time: '23:30',
      location: '123 Mbare, Harare',
      coordinates: { lat: -17.8450, lng: 31.0333 },
      modusOperandi: ['Forced back door', 'Stole electronics', 'Night time'],
      suspects: ['S-2024-001'],
      evidence: [
        'Fingerprints on window',
        'Shoe size 10',
        'Security footage'
      ],
      witnesses: ['Neighbor saw person fleeing'],
      propertyStolen: ['TV', 'Laptop', 'Cash $500'],
      status: 'Active Investigation',
      respondingOfficer: 'Insp. Makoni'
    },
    {
      id: 'C-2026-145',
      type: 'Fraud',
      date: '2026-03-16',
      time: '14:15',
      location: 'Online Banking',
      coordinates: { lat: -17.8292, lng: 31.0522 },
      modusOperandi: ['Phishing', 'Bank transfer fraud', 'Identity theft'],
      suspects: ['S-2024-045'],
      evidence: [
        'IP address 196.45.32.123',
        'Fake email records',
        'Bank statements'
      ],
      witnesses: ['Bank security team'],
      propertyStolen: ['$5,000 transferred'],
      status: 'Under Investigation',
      respondingOfficer: 'Insp. Dube'
    },
    {
      id: 'C-2026-167',
      type: 'Armed Robbery',
      date: '2026-03-14',
      time: '10:30',
      location: 'First Capital Bank, CBD',
      coordinates: { lat: -17.8277, lng: 31.0530 },
      modusOperandi: ['Armed', 'Masked', 'Getaway vehicle'],
      suspects: ['S-2024-089'],
      evidence: [
        'Shell casings',
        'Security footage',
        'Vehicle description'
      ],
      witnesses: ['Bank tellers', 'Security guards'],
      propertyStolen: ['$20,000 cash'],
      status: 'High Priority',
      respondingOfficer: 'Insp. Makoni'
    },
    {
      id: 'C-2026-189',
      type: 'Burglary',
      date: '2026-03-18',
      time: '22:45',
      location: '456 Highfield, Harare',
      coordinates: { lat: -17.8600, lng: 31.0450 },
      modusOperandi: ['Forced window', 'Electronics theft', 'Night time'],
      suspects: ['Unknown'],
      evidence: [
        'Shoe prints',
        'Partial fingerprint'
      ],
      witnesses: [],
      propertyStolen: ['TV', 'PlayStation', 'Jewelry'],
      status: 'New Case',
      respondingOfficer: 'Insp. Sibanda'
    },
    {
      id: 'C-2026-201',
      type: 'Vehicle Theft',
      date: '2026-03-17',
      time: '20:00',
      location: 'Borrowdale, Harare',
      coordinates: { lat: -17.7550, lng: 31.0922 },
      modusOperandi: ['Hot-wiring', 'Night time', 'Targeted luxury car'],
      suspects: ['Unknown'],
      evidence: [
        'Broken glass',
        'CCTV footage'
      ],
      witnesses: ['Security guard'],
      propertyStolen: ['Toyota Land Cruiser'],
      status: 'Active Investigation',
      respondingOfficer: 'Insp. Moyo'
    }
  ];

  // Mock modus operandi patterns
  const moPatterns = [
    {
      id: 'MO-001',
      name: 'Night Burglary Pattern',
      characteristics: [
        'Night time (22:00-04:00)',
        'Forced entry through back',
        'Targets electronics',
        'Avoids alarms'
      ],
      associatedSuspects: ['S-2024-001'],
      frequency: 'High',
      lastOccurrence: '2026-03-18'
    },
    {
      id: 'MO-002',
      name: 'Online Fraud Pattern',
      characteristics: [
        'Phishing emails',
        'Bank transfers',
        'Identity theft',
        'Fake documents'
      ],
      associatedSuspects: ['S-2024-045'],
      frequency: 'Medium',
      lastOccurrence: '2026-03-16'
    },
    {
      id: 'MO-003',
      name: 'Armed Robbery Pattern',
      characteristics: [
        'Armed with firearm',
        'Wears mask',
        'Targets banks',
        'Uses getaway vehicle'
      ],
      associatedSuspects: ['S-2024-089'],
      frequency: 'Low',
      lastOccurrence: '2026-03-14'
    }
  ];

  // Mock geographic patterns
  const geoPatterns = [
    {
      area: 'Mbare',
      crimeTypes: ['Burglary', 'Assault'],
      peakTimes: ['22:00-02:00'],
      commonSuspects: ['S-2024-001'],
      riskLevel: 'High'
    },
    {
      area: 'CBD',
      crimeTypes: ['Robbery', 'Fraud', 'Pickpocketing'],
      peakTimes: ['12:00-15:00', '18:00-20:00'],
      commonSuspects: [],
      riskLevel: 'Medium'
    },
    {
      area: 'Borrowdale',
      crimeTypes: ['Vehicle Theft', 'Burglary'],
      peakTimes: ['20:00-23:00'],
      commonSuspects: ['S-2024-089'],
      riskLevel: 'Medium'
    }
  ];

  // Mock link analysis data
  const linkNetwork = [
    { from: 'S-2024-001', to: 'C-2026-123', relation: 'suspect' },
    { from: 'S-2024-001', to: 'Peter Smith', relation: 'associate' },
    { from: 'S-2024-001', to: 'MO-001', relation: 'modus operandi' },
    { from: 'S-2024-045', to: 'C-2026-145', relation: 'suspect' },
    { from: 'S-2024-045', to: 'Mary Johnson', relation: 'associate' },
    { from: 'S-2024-045', to: 'MO-002', relation: 'modus operandi' },
    { from: 'S-2024-089', to: 'C-2026-167', relation: 'suspect' },
    { from: 'S-2024-089', to: 'Patrick Ndlovu', relation: 'associate' },
    { from: 'S-2024-089', to: 'MO-003', relation: 'modus operandi' }
  ];

  // Calculate matches based on search
  const matchedProfiles = useMemo(() => {
    if (!searchQuery) return [];

    const query = searchQuery.toLowerCase();
    const matches = [];

    suspectProfiles.forEach(profile => {
      let score = 0;
      let matchReasons = [];

      // Name match
      if (profile.name.toLowerCase().includes(query)) {
        score += 30;
        matchReasons.push('Name match');
      }

      // Alias match
      if (profile.alias.toLowerCase().includes(query)) {
        score += 25;
        matchReasons.push('Alias match');
      }

      // ID match
      if (profile.idNumber.toLowerCase().includes(query)) {
        score += 40;
        matchReasons.push('ID number match');
      }

      // Phone match
      if (profile.phone.includes(query)) {
        score += 35;
        matchReasons.push('Phone number match');
      }

      // Physical features
      if (profile.physicalFeatures.some(f => f.toLowerCase().includes(query))) {
        score += 15;
        matchReasons.push('Physical features match');
      }

      // Modus operandi
      if (profile.modusOperandi.some(m => m.toLowerCase().includes(query))) {
        score += 20;
        matchReasons.push('MO pattern match');
      }

      if (score > 0) {
        matches.push({
          ...profile,
          matchScore: Math.min(score, 100),
          matchReasons
        });
      }
    });

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }, [searchQuery]);

  // Calculate case matches
  const matchedCases = useMemo(() => {
    if (!searchQuery) return [];

    const query = searchQuery.toLowerCase();
    const matches = [];

    crimeCases.forEach(crimeCase => {
      let score = 0;
      let matchReasons = [];

      // Case ID match
      if (crimeCase.id.toLowerCase().includes(query)) {
        score += 40;
        matchReasons.push('Case ID match');
      }

      // Crime type match
      if (crimeCase.type.toLowerCase().includes(query)) {
        score += 25;
        matchReasons.push('Crime type match');
      }

      // Location match
      if (crimeCase.location.toLowerCase().includes(query)) {
        score += 20;
        matchReasons.push('Location match');
      }

      // Modus operandi
      if (crimeCase.modusOperandi.some(m => m.toLowerCase().includes(query))) {
        score += 15;
        matchReasons.push('MO pattern match');
      }

      // Suspect match
      if (crimeCase.suspects.some(s => s.toLowerCase().includes(query))) {
        score += 30;
        matchReasons.push('Suspect match');
      }

      if (score > 0) {
        matches.push({
          ...crimeCase,
          matchScore: Math.min(score, 100),
          matchReasons
        });
      }
    });

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }, [searchQuery]);

  // Calculate MO pattern matches
  const matchedPatterns = useMemo(() => {
    if (!searchQuery) return [];

    const query = searchQuery.toLowerCase();
    const matches = [];

    moPatterns.forEach(pattern => {
      let score = 0;
      let matchReasons = [];

      // Pattern name match
      if (pattern.name.toLowerCase().includes(query)) {
        score += 35;
        matchReasons.push('Pattern name match');
      }

      // Characteristics match
      if (pattern.characteristics.some(c => c.toLowerCase().includes(query))) {
        score += 25;
        matchReasons.push('Characteristics match');
      }

      if (score > 0) {
        matches.push({
          ...pattern,
          matchScore: Math.min(score, 100),
          matchReasons
        });
      }
    });

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }, [searchQuery]);

  // Find related cases for a suspect
  const findRelatedCases = (suspectId) => {
    return crimeCases.filter(crimeCase => 
      crimeCase.suspects.includes(suspectId) ||
      crimeCase.evidence.some(e => e.includes(suspectId))
    );
  };

  // Find similar cases based on MO
  const findSimilarCases = (crimeCase) => {
    return crimeCases.filter(c => 
      c.id !== crimeCase.id &&
      c.modusOperandi.some(mo => crimeCase.modusOperandi.includes(mo))
    ).map(c => ({ ...c, similarity: Math.floor(Math.random() * 40) + 60 }));
  };

  // Calculate risk score for a suspect
  const calculateRiskScore = (suspect) => {
    let score = 50; // Base score
    
    // Previous convictions
    score += suspect.previousConvictions.length * 10;
    
    // Active warrant
    if (suspect.activeWarrant) score += 15;
    
    // Recent activity
    const daysSinceLastSeen = Math.floor((new Date() - new Date(suspect.lastSeen)) / (1000 * 60 * 60 * 24));
    if (daysSinceLastSeen < 7) score += 20;
    
    // Risk level modifier
    if (suspect.riskLevel === 'Critical') score += 25;
    if (suspect.riskLevel === 'High') score += 15;
    
    return Math.min(score, 100);
  };

  // Match Card Component
  const MatchCard = ({ item, type, onSelect }) => (
    <div 
      className={`card mb-2 ${selectedProfile?.id === item.id ? 'border-primary border-2' : ''}`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(item)}
    >
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h6 className="fw-bold mb-1">
              {type === 'suspect' && item.name}
              {type === 'case' && `${item.type} - ${item.id}`}
              {type === 'pattern' && item.name}
            </h6>
            <div className="small text-muted">
              {type === 'suspect' && (
                <>
                  <span className="me-3">ID: {item.id}</span>
                  <span className="me-3">Age: {item.age}</span>
                  <span>Risk: {item.riskLevel}</span>
                </>
              )}
              {type === 'case' && (
                <>
                  <span className="me-3">Date: {item.date}</span>
                  <span className="me-3">Status: {item.status}</span>
                </>
              )}
              {type === 'pattern' && (
                <>
                  <span className="me-3">Frequency: {item.frequency}</span>
                  <span>Last: {item.lastOccurrence}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-end">
            <div className="h5 mb-0 text-primary">{item.matchScore}%</div>
            <small className="text-muted">match</small>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="progress mt-2" style={{ height: '4px' }}>
          <div 
            className={`progress-bar bg-${item.matchScore > 80 ? 'success' : item.matchScore > 60 ? 'warning' : 'info'}`}
            style={{ width: `${item.matchScore}%` }}
          ></div>
        </div>

        {/* Match reasons */}
        <div className="mt-2">
          {item.matchReasons.slice(0, 2).map((reason, idx) => (
            <span key={idx} className="badge bg-light text-dark me-1">
              <i className="bi bi-check-circle-fill text-success me-1" style={{ fontSize: '0.7rem' }}></i>
              {reason}
            </span>
          ))}
          {item.matchReasons.length > 2 && (
            <span className="badge bg-light text-dark">
              +{item.matchReasons.length - 2} more
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Link Analysis Visualization (simplified)
  const LinkVisualization = ({ network }) => {
    return (
      <div className="bg-light p-3 rounded" style={{ minHeight: '200px' }}>
        <div className="text-center text-muted py-4">
          <i className="bi bi-diagram-3 fs-1 d-block mb-2"></i>
          <p>Link analysis visualization would appear here</p>
          <small>Showing connections between suspects, cases, and associates</small>
          <div className="mt-3">
            <span className="badge bg-primary me-2">15 nodes</span>
            <span className="badge bg-secondary">23 connections</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">
        {/* Header */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom">
            <div className='my-0'>
                <h1 className="display-6 fw-bold" style={{ color: '#2c3e50' }}>
                  <i className="bi bi-fingerprint me-3 text-primary"></i>
                  Crime Profile Matcher
                </h1>
            </div>
            <div className="user-profile py-2 px-0 ">
                <span className="badge bg-primary text-dark rounded-2">Admin User</span>
            </div>
        </header>
        <div className="row mb-2 mt-2">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div className='align-items-center'>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-primary">
                  <i className="bi bi-shield-shaded"></i> New Profile
                </button>
                <button className="btn btn-primary">
                  <i className="bi bi-search"></i> Advanced Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Search Bar */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-search"></i>
                      </span>
                      <input 
                        type="text" 
                        className="form-control form-control-lg" 
                        placeholder="Search by name, ID, MO, location, or evidence..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <select 
                      className="form-select"
                      value={selectedFilters.crimeType}
                      onChange={(e) => setSelectedFilters({...selectedFilters, crimeType: e.target.value})}
                    >
                      <option value="all">All Crime Types</option>
                      <option value="burglary">Burglary</option>
                      <option value="robbery">Robbery</option>
                      <option value="fraud">Fraud</option>
                      <option value="theft">Theft</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <select 
                      className="form-select"
                      value={selectedFilters.location}
                      onChange={(e) => setSelectedFilters({...selectedFilters, location: e.target.value})}
                    >
                      <option value="all">All Locations</option>
                      <option value="harare">Harare</option>
                      <option value="bulawayo">Bulawayo</option>
                      <option value="mutare">Mutare</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <select 
                      className="form-select"
                      value={selectedFilters.timeframe}
                      onChange={(e) => setSelectedFilters({...selectedFilters, timeframe: e.target.value})}
                    >
                      <option value="all">All Time</option>
                      <option value="24h">Last 24 Hours</option>
                      <option value="week">Last Week</option>
                      <option value="month">Last Month</option>
                    </select>
                  </div>
                </div>

                {/* Match Threshold Slider */}
                <div className="row mt-3">
                  <div className="col-md-6">
                    <label className="form-label small text-muted">
                      Match Threshold: {matchThreshold}%
                    </label>
                    <input 
                      type="range" 
                      className="form-range" 
                      min="0" 
                      max="100" 
                      value={matchThreshold}
                      onChange={(e) => setMatchThreshold(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 text-end">
                    <button 
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      <i className={`bi bi-chevron-${showAdvanced ? 'up' : 'down'}`}></i>
                      {showAdvanced ? ' Hide' : ' Show'} Advanced
                    </button>
                    <button className="btn btn-sm btn-primary">
                      <i className="bi bi-funnel"></i> Apply Filters
                    </button>
                  </div>
                </div>

                {/* Advanced Options */}
                {showAdvanced && (
                  <div className="row mt-3 p-3 bg-light rounded">
                    <div className="col-md-3">
                      <label className="form-label small">Analysis Mode</label>
                      <select 
                        className="form-select form-select-sm"
                        value={analysisMode}
                        onChange={(e) => setAnalysisMode(e.target.value)}
                      >
                        <option value="basic">Basic Matching</option>
                        <option value="advanced">Advanced AI</option>
                        <option value="predictive">Predictive Analysis</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Match Algorithm</label>
                      <select className="form-select form-select-sm">
                        <option>Fuzzy Matching</option>
                        <option>Exact Match</option>
                        <option>Pattern Recognition</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Weight by</label>
                      <select className="form-select form-select-sm">
                        <option>Recent Activity</option>
                        <option>MO Similarity</option>
                        <option>Location Proximity</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Include</label>
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="includeCold" />
                        <label className="form-check-label small" htmlFor="includeCold">
                          Cold Cases
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Tabs */}
        <div className="row mb-3">
          <div className="col-12">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'suspect' ? 'active' : ''}`}
                  onClick={() => setActiveTab('suspect')}
                >
                  <i className="bi bi-person-badge me-2"></i>
                  Suspect Profiles
                  <span className="badge bg-primary ms-2">{matchedProfiles.length}</span>
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'case' ? 'active' : ''}`}
                  onClick={() => setActiveTab('case')}
                >
                  <i className="bi bi-folder2-open me-2"></i>
                  Crime Cases
                  <span className="badge bg-primary ms-2">{matchedCases.length}</span>
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'pattern' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pattern')}
                >
                  <i className="bi bi-diagram-3 me-2"></i>
                  MO Patterns
                  <span className="badge bg-primary ms-2">{matchedPatterns.length}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="row">
          {/* Results List */}
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <h6 className="mb-0">Matching Results</h6>
              </div>
              <div className="card-body p-2" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {activeTab === 'suspect' && (
                  matchedProfiles.length > 0 ? (
                    matchedProfiles.map(profile => (
                      <MatchCard 
                        key={profile.id} 
                        item={profile} 
                        type="suspect"
                        onSelect={setSelectedProfile}
                      />
                    ))
                  ) : (
                    <div className="text-center text-muted py-4">
                      <i className="bi bi-search fs-1 d-block mb-2"></i>
                      <p>Enter search terms to find matches</p>
                    </div>
                  )
                )}

                {activeTab === 'case' && (
                  matchedCases.length > 0 ? (
                    matchedCases.map(crimeCase => (
                      <MatchCard 
                        key={crimeCase.id} 
                        item={crimeCase} 
                        type="case"
                        onSelect={setSelectedProfile}
                      />
                    ))
                  ) : (
                    <div className="text-center text-muted py-4">
                      <i className="bi bi-search fs-1 d-block mb-2"></i>
                      <p>No matching cases found</p>
                    </div>
                  )
                )}

                {activeTab === 'pattern' && (
                  matchedPatterns.length > 0 ? (
                    matchedPatterns.map(pattern => (
                      <MatchCard 
                        key={pattern.id} 
                        item={pattern} 
                        type="pattern"
                        onSelect={setSelectedProfile}
                      />
                    ))
                  ) : (
                    <div className="text-center text-muted py-4">
                      <i className="bi bi-search fs-1 d-block mb-2"></i>
                      <p>No matching patterns found</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <h6 className="mb-0">
                  <i className="bi bi-info-circle me-2 text-primary"></i>
                  Profile Details
                </h6>
              </div>
              <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {selectedProfile ? (
                  activeTab === 'suspect' ? (
                    <div>
                      {/* Suspect Details */}
                      <div className="text-center mb-4">
                        <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-2">
                          <i className="bi bi-person-circle text-primary fs-1"></i>
                        </div>
                        <h5 className="fw-bold">{selectedProfile.name}</h5>
                        <span className={`badge bg-${selectedProfile.riskLevel === 'Critical' ? 'danger' : selectedProfile.riskLevel === 'High' ? 'warning' : 'info'} mb-2`}>
                          Risk Level: {selectedProfile.riskLevel}
                        </span>
                      </div>

                      {/* Risk Score */}
                      <div className="mb-3">
                        <label className="small text-muted">Risk Score</label>
                        <div className="d-flex align-items-center">
                          <div className="flex-grow-1 me-2">
                            <div className="progress" style={{ height: '8px' }}>
                              <div 
                                className={`progress-bar bg-${calculateRiskScore(selectedProfile) > 80 ? 'danger' : calculateRiskScore(selectedProfile) > 60 ? 'warning' : 'info'}`}
                                style={{ width: `${calculateRiskScore(selectedProfile)}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="fw-bold">{calculateRiskScore(selectedProfile)}%</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">ID Number</label>
                        <p className="fw-medium mb-1">{selectedProfile.idNumber}</p>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Physical Features</label>
                        <ul className="list-unstyled mb-1">
                          {selectedProfile.physicalFeatures.map((feature, idx) => (
                            <li key={idx} className="small">
                              <i className="bi bi-check-circle text-success me-1"></i>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Modus Operandi</label>
                        <ul className="list-unstyled mb-1">
                          {selectedProfile.modusOperandi.map((mo, idx) => (
                            <li key={idx} className="small">
                              <i className="bi bi-gear text-primary me-1"></i>
                              {mo}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Previous Convictions</label>
                        {selectedProfile.previousConvictions.map((conviction, idx) => (
                          <div key={idx} className="small bg-light p-2 rounded mb-1">
                            <span className="fw-medium">{conviction.crime}</span>
                            <br />
                            <span className="text-muted">{conviction.year} - {conviction.sentence}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Associated Cases</label>
                        {findRelatedCases(selectedProfile.id).map(crimeCase => (
                          <div key={crimeCase.id} className="small bg-light p-2 rounded mb-1">
                            <span className="fw-medium">{crimeCase.type}</span>
                            <br />
                            <span className="text-muted">{crimeCase.date} - {crimeCase.status}</span>
                          </div>
                        ))}
                      </div>

                      <div className="d-grid gap-2 mt-3">
                        <button className="btn btn-primary btn-sm">
                          <i className="bi bi-eye"></i> View Full Profile
                        </button>
                        <button className="btn btn-outline-primary btn-sm">
                          <i className="bi bi-link"></i> Link to Case
                        </button>
                      </div>
                    </div>
                  ) : activeTab === 'case' ? (
                    <div>
                      {/* Case Details */}
                      <div className="text-center mb-4">
                        <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex p-3 mb-2">
                          <i className="bi bi-folder2-open text-warning fs-1"></i>
                        </div>
                        <h5 className="fw-bold">{selectedProfile.id}</h5>
                        <span className={`badge bg-${selectedProfile.status === 'High Priority' ? 'danger' : 'info'}`}>
                          {selectedProfile.status}
                        </span>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Type</label>
                        <p className="fw-medium">{selectedProfile.type}</p>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Date & Time</label>
                        <p className="fw-medium">{selectedProfile.date} at {selectedProfile.time}</p>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Location</label>
                        <p className="fw-medium">{selectedProfile.location}</p>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Modus Operandi</label>
                        <ul className="list-unstyled">
                          {selectedProfile.modusOperandi.map((mo, idx) => (
                            <li key={idx} className="small">
                              <i className="bi bi-gear text-primary me-1"></i>
                              {mo}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Evidence</label>
                        <ul className="list-unstyled">
                          {selectedProfile.evidence.map((item, idx) => (
                            <li key={idx} className="small">
                              <i className="bi bi-file-text text-info me-1"></i>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Property Stolen</label>
                        <ul className="list-unstyled">
                          {selectedProfile.propertyStolen.map((item, idx) => (
                            <li key={idx} className="small">
                              <i className="bi bi-box text-danger me-1"></i>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Similar Cases */}
                      <div className="mb-3">
                        <label className="small text-muted">Similar Cases</label>
                        {findSimilarCases(selectedProfile).map(crimeCase => (
                          <div key={crimeCase.id} className="small bg-light p-2 rounded mb-1">
                            <span className="fw-medium">{crimeCase.id}</span>
                            <span className="badge bg-info ms-2">{crimeCase.similarity}% similar</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Pattern Details */}
                      <div className="text-center mb-4">
                        <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex p-3 mb-2">
                          <i className="bi bi-diagram-3 text-info fs-1"></i>
                        </div>
                        <h5 className="fw-bold">{selectedProfile.name}</h5>
                        <span className="badge bg-info">MO Pattern</span>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Characteristics</label>
                        <ul className="list-unstyled">
                          {selectedProfile.characteristics.map((char, idx) => (
                            <li key={idx} className="small mb-1">
                              <i className="bi bi-check-circle text-success me-1"></i>
                              {char}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Frequency</label>
                        <p className="fw-medium">{selectedProfile.frequency}</p>
                      </div>

                      <div className="mb-3">
                        <label className="small text-muted">Associated Suspects</label>
                        {suspectProfiles
                          .filter(s => selectedProfile.associatedSuspects.includes(s.id))
                          .map(suspect => (
                            <div key={suspect.id} className="small bg-light p-2 rounded mb-1">
                              <span className="fw-medium">{suspect.name}</span>
                              <br />
                              <span className="text-muted">{suspect.id}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-arrow-left-circle fs-1 d-block mb-2"></i>
                    <p>Select a match to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Link Analysis */}
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <h6 className="mb-0">
                  <i className="bi bi-diagram-3 me-2 text-primary"></i>
                  Link Analysis
                </h6>
              </div>
              <div className="card-body">
                <LinkVisualization network={linkNetwork} />

                {/* Quick Stats */}
                <div className="mt-3">
                  <h6 className="fw-bold mb-3">Connection Insights</h6>
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="bg-light p-2 rounded text-center">
                        <small className="text-muted">Direct Links</small>
                        <h6 className="mb-0">8</h6>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light p-2 rounded text-center">
                        <small className="text-muted">Secondary Links</small>
                        <h6 className="mb-0">15</h6>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light p-2 rounded text-center">
                        <small className="text-muted">Network Density</small>
                        <h6 className="mb-0">67%</h6>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light p-2 rounded text-center">
                        <small className="text-muted">Central Nodes</small>
                        <h6 className="mb-0">3</h6>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Geographic Pattern */}
                <div className="mt-3">
                  <h6 className="fw-bold mb-2">Geographic Pattern</h6>
                  <div className="bg-light p-2 rounded">
                    {geoPatterns.map((pattern, idx) => (
                      <div key={idx} className="small mb-2">
                        <div className="d-flex justify-content-between">
                          <span className="fw-medium">{pattern.area}</span>
                          <span className={`badge bg-${pattern.riskLevel === 'High' ? 'danger' : 'info'}`}>
                            {pattern.riskLevel}
                          </span>
                        </div>
                        <div className="text-muted">
                          <small>Peak: {pattern.peakTimes.join(', ')}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-grid gap-2 mt-4">
                  <button className="btn btn-primary">
                    <i className="bi bi-share"></i> Export Link Analysis
                  </button>
                  <button className="btn btn-outline-primary">
                    <i className="bi bi-printer"></i> Generate Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Match Summary */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h5 className="mb-2">AI-Powered Pattern Recognition</h5>
                    <p className="mb-0 small opacity-75">
                      System has identified 3 new potential matches based on recent cases. 
                      Click to review automated suggestions.
                    </p>
                  </div>
                  <div className="col-md-4 text-end">
                    <button className="btn btn-light">
                      <i className="bi bi-stars me-2"></i>
                      View Suggestions
                    </button>
                  </div>
                </div>
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

export default CrimeProfileMatcher;