/**
 * src/components/main/home_components/RRB.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Report Record Book — creates a new crime incident on the Django backend.
 *
 * Updates:
 * • Integrated fields from Z.R.P. Form 66 (Report Record): Prosecutor Ref, CRB, 
 * Accused details, Fingerprints, Exhibits, Value Stolen/Recovered, and Results.
 * • Integrated fields from Z.R.P. Form 169 (Stolen Property): Complainant Name/Age/Sex.
 * • Interactive Leaflet Map for geographic selection.
 * • Complex form state is serialized into structured narrative blocks for the backend.
 */

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createIncident, getCrimeTypes } from '../../../services/crimeService';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41], popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const generateCaseNumber = () => {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `ZRP-${year}-${rand}`;
};

// ─── Expanded Initial Form State (Form 66 & 169) ─────────────────────────────
const INITIAL_FORM = {
  // Admin & Ref
  caseNumber: generateCaseNumber(),
  prosecutorRef: '', crbNo: '', policeFilingRef: '',
  station: '', section: '', investigatingOfficer: '',
  reportReceivedDate: '', reportReceivedTime: '', reportReceivedBy: '',

  // Complainant (Form 66/169)
  complainant: {
    name: '', rcNr: '', race: '', sex: '', age: '',
    residentialAddress: '', residentialPhone: '',
    businessAddress: '', businessPhone: ''
  },

  // Accused (Form 66)
  accused: {
    name: '', rcNr: '', race: '', sex: '', age: '',
    residentialAddress: '', residentialPhone: '',
    businessAddress: '', businessPhone: ''
  },

  // Occurrence
  crimeTypeId: '',
  occStartDatetime: '', occEndDatetime: '',
  suburb: '', latitude: '', longitude: '',

  // Details & Forensics (Form 66)
  briefDetails: '', modusOperandi: '', weaponUsed: '', numSuspects: 0, serialGroupLabel: '',
  valueStolen: '', valueRecovered: '', exhibitsHeld: 'NO',
  fingerprintsFound: 'NEG', cidReference: '', resultsFindings: '', status: 'reported',

  stolenItems: [],
};

const INITIAL_ITEM = { description: '', identifyingMarks: '', dateRecovered: '' };

function RRB() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [currentItem, setCurrentItem] = useState(INITIAL_ITEM);
  const [showRecoverySection, setShowRecoverySection] = useState(false);
  const [cancellationOfficer, setCancellationOfficer] = useState('');

  const [crimeTypes, setCrimeTypes] = useState([]);
  const [crimeTypesLoading, setCrimeTypesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  useEffect(() => {
    setCrimeTypesLoading(true);
    getCrimeTypes().then(setCrimeTypes).catch(() => setCrimeTypes([])).finally(() => setCrimeTypesLoading(false));
  }, []);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      const defaultCenter = [-17.8292, 31.0522];
      mapInstance.current = L.map(mapRef.current).setView(defaultCenter, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
      markerInstance.current = L.marker(defaultCenter, { draggable: true }).addTo(mapInstance.current);

      mapInstance.current.on('click', (e) => {
        markerInstance.current.setLatLng(e.latlng);
        handleLocationSelect(e.latlng.lat, e.latlng.lng);
      });
      markerInstance.current.on('dragend', () => {
        const pos = markerInstance.current.getLatLng();
        handleLocationSelect(pos.lat, pos.lng);
      });
    }
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  const handleLocationSelect = async (lat, lng) => {
    setFormData(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
    setIsResolvingAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data?.address) {
        const areaName = data.address.suburb || data.address.neighbourhood || data.address.city || "";
        if (areaName) setFormData(prev => ({ ...prev, suburb: areaName }));
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: val } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleItemChange = (e) => setCurrentItem(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const addStolenItem = () => {
    if (currentItem.description) {
      setFormData(prev => ({ ...prev, stolenItems: [...prev.stolenItems, { ...currentItem, id: Date.now() }] }));
      setCurrentItem(INITIAL_ITEM);
    }
  };

  const removeStolenItem = (id) => setFormData(prev => ({ ...prev, stolenItems: prev.stolenItems.filter(i => i.id !== id) }));
  const markAsRecovered = (id, date) => setFormData(prev => ({ ...prev, stolenItems: prev.stolenItems.map(i => i.id === id ? { ...i, dateRecovered: date } : i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(''); setSubmitSuccess(null);

    if (!formData.crimeTypeId) { setSubmitError('Offence type is required.'); return; }
    if (!formData.occStartDatetime) { setSubmitError('Occurrence start time is required.'); return; }
    if (!formData.latitude || !formData.longitude) { setSubmitError('Please drop a pin on the map.'); return; }

    // Serialize Form 66 Fields into the Narrative blocks for the backend
    const adminBlock = `--- ADMIN & REFS ---\nProsecutor Ref: ${formData.prosecutorRef} | CRB: ${formData.crbNo} | Filing Ref: ${formData.policeFilingRef}\nReceived: ${formData.reportReceivedDate} ${formData.reportReceivedTime} by ${formData.reportReceivedBy}\nOccurred Between: ${formData.occStartDatetime} and ${formData.occEndDatetime}`;
    
    const c = formData.complainant;
    const complainantBlock = `--- COMPLAINANT ---\nName: ${c.name} | NR: ${c.rcNr} | Race: ${c.race} | Sex: ${c.sex} | Age: ${c.age}\nRes: ${c.residentialAddress} (Tel: ${c.residentialPhone})\nBus: ${c.businessAddress} (Tel: ${c.businessPhone})`;
    
    const a = formData.accused;
    const accusedBlock = `--- ACCUSED ---\nName: ${a.name} | NR: ${a.rcNr} | Race: ${a.race} | Sex: ${a.sex} | Age: ${a.age}\nRes: ${a.residentialAddress} (Tel: ${a.residentialPhone})\nBus: ${a.businessAddress} (Tel: ${a.businessPhone})`;

    const forensicsBlock = `--- FORENSICS & FINDINGS ---\nValue Stolen: ${formData.valueStolen} | Value Recovered: ${formData.valueRecovered}\nExhibits Held: ${formData.exhibitsHeld} | Fingerprints: ${formData.fingerprintsFound} (CID Ref: ${formData.cidReference})\nResults: ${formData.resultsFindings}`;

    const stolenItemsText = formData.stolenItems.length ? '\n--- STOLEN ITEMS (FORM 169) ---\n' + formData.stolenItems.map((item, i) => `${i + 1}. ${item.description} | Marks: ${item.identifyingMarks}${item.dateRecovered ? ` | Recovered: ${item.dateRecovered}` : ''}`).join('\n') : '';

    const payload = {
      case_number: formData.caseNumber,
      crime_type: Number(formData.crimeTypeId),
      timestamp: new Date(formData.occStartDatetime).toISOString(), // Primary backend timestamp
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      suburb: formData.suburb.trim(),
      description_narrative: [adminBlock, complainantBlock, accusedBlock, forensicsBlock, formData.briefDetails].filter(Boolean).join('\n\n'),
      modus_operandi: [formData.modusOperandi, stolenItemsText].filter(Boolean).join('\n'),
      status: formData.status,
      weapon_used: formData.weaponUsed,
      num_suspects: Number(formData.numSuspects) || 0,
      serial_group_label: formData.serialGroupLabel,
    };

    setSubmitting(true);
    try {
      const created = await createIncident(payload);
      setSubmitSuccess(created);
      handleReset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(err.response?.data ? JSON.stringify(err.response.data) : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({ ...INITIAL_FORM, caseNumber: generateCaseNumber() });
    setSubmitError(''); setSubmitSuccess(null);
    if (markerInstance.current && mapInstance.current) {
      markerInstance.current.setLatLng([-17.8292, 31.0522]);
      mapInstance.current.setView([-17.8292, 31.0522], 13);
    }
  };

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">
        {/* Header */}
        <div className="card shadow-sm border-dark mb-4">
          <div className="card-header bg-dark text-white text-center py-3">
            <h3 className="mb-0 fw-bold">ZIMBABWE REPUBLIC POLICE</h3>
            <h5 className="mb-0">REPORT RECORD BOOK (FORM 66 & 169)</h5>
          </div>
        </div>

        {submitSuccess && <div className="alert alert-success">Incident {submitSuccess.case_number} recorded successfully!</div>}
        {submitError && <div className="alert alert-danger">Error: {submitError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-lg-8">

              {/* ── Admin & References (Form 66) ── */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header bg-secondary text-white fw-bold">Administrative & References</div>
                <div className="card-body bg-light">
                  <div className="row g-2 mb-2">
                    <div className="col-md-3"><label className="small fw-bold">Station</label><input type="text" className="form-control form-control-sm" name="station" value={formData.station} onChange={handleInputChange} /></div>
                    <div className="col-md-3"><label className="small fw-bold">Section Ref</label><input type="text" className="form-control form-control-sm" name="section" value={formData.section} onChange={handleInputChange} /></div>
                    <div className="col-md-3"><label className="small fw-bold">Invest. Off.</label><input type="text" className="form-control form-control-sm" name="investigatingOfficer" value={formData.investigatingOfficer} onChange={handleInputChange} /></div>
                    <div className="col-md-3"><label className="small fw-bold text-primary">C.R. / L.P.B. No</label><input type="text" className="form-control form-control-sm border-primary" name="caseNumber" value={formData.caseNumber} onChange={handleInputChange} required /></div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-4"><label className="small">Prosecutor's Ref</label><input type="text" className="form-control form-control-sm" name="prosecutorRef" value={formData.prosecutorRef} onChange={handleInputChange} /></div>
                    <div className="col-md-4"><label className="small">C.R.B. No</label><input type="text" className="form-control form-control-sm" name="crbNo" value={formData.crbNo} onChange={handleInputChange} /></div>
                    <div className="col-md-4"><label className="small">Police Filing Ref</label><input type="text" className="form-control form-control-sm" name="policeFilingRef" value={formData.policeFilingRef} onChange={handleInputChange} /></div>
                  </div>
                  <hr className="my-2"/>
                  <div className="row g-2">
                    <div className="col-md-4"><label className="small">Report Received (Date)</label><input type="date" className="form-control form-control-sm" name="reportReceivedDate" value={formData.reportReceivedDate} onChange={handleInputChange} /></div>
                    <div className="col-md-4"><label className="small">Time</label><input type="time" className="form-control form-control-sm" name="reportReceivedTime" value={formData.reportReceivedTime} onChange={handleInputChange} /></div>
                    <div className="col-md-4"><label className="small">By (Officer)</label><input type="text" className="form-control form-control-sm" name="reportReceivedBy" value={formData.reportReceivedBy} onChange={handleInputChange} /></div>
                  </div>
                </div>
              </div>

              {/* ── Occurrence & Map ── */}
              <div className="card mb-4 shadow-sm border-warning">
                <div className="card-header bg-warning text-dark fw-bold">Offence & Occurrence</div>
                <div className="card-body">
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="fw-bold small">Offence / Crime Type <span className="text-danger">*</span></label>
                      <select className="form-select form-select-sm" name="crimeTypeId" value={formData.crimeTypeId} onChange={handleInputChange} required>
                        <option value="">— Select —</option>
                        {crimeTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="fw-bold small">Status</label>
                      <select className="form-select form-select-sm" name="status" value={formData.status} onChange={handleInputChange}>
                        <option value="reported">Reported</option>
                        <option value="under_investigation">Under Investigation</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="fw-bold small">Occurred Between (Start) <span className="text-danger">*</span></label>
                      <input type="datetime-local" className="form-control form-control-sm" name="occStartDatetime" value={formData.occStartDatetime} onChange={handleInputChange} required />
                    </div>
                    <div className="col-md-6">
                      <label className="fw-bold small">And (End) <span className="text-muted fw-normal">(Optional)</span></label>
                      <input type="datetime-local" className="form-control form-control-sm" name="occEndDatetime" value={formData.occEndDatetime} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="p-2 border rounded bg-light">
                    <label className="fw-bold small text-primary mb-2"><i className="bi bi-pin-map-fill"></i> Place of Occurrence <span className="text-danger">*</span></label>
                    <div ref={mapRef} style={{ height: '250px', width: '100%', borderRadius: '4px' }} className="mb-2 border" />
                    <div className="row g-2">
                      <div className="col-md-6">
                        <input type="text" className="form-control form-control-sm" name="suburb" value={formData.suburb} onChange={handleInputChange} placeholder="Suburb / Scene Name" required />
                      </div>
                      <div className="col-md-3">
                        <input type="text" className="form-control form-control-sm" value={formData.latitude} readOnly placeholder="Lat" />
                      </div>
                      <div className="col-md-3">
                        <input type="text" className="form-control form-control-sm" value={formData.longitude} readOnly placeholder="Lng" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Complainant & Accused (Form 66) ── */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="card shadow-sm h-100 border-primary">
                    <div className="card-header bg-primary text-white py-2 small fw-bold">COMPLAINANT / INFORMANT</div>
                    <div className="card-body p-2">
                      <input type="text" className="form-control form-control-sm mb-2" name="complainant.name" value={formData.complainant.name} onChange={handleInputChange} placeholder="Full Name" />
                      <input type="text" className="form-control form-control-sm mb-2" name="complainant.rcNr" value={formData.complainant.rcNr} onChange={handleInputChange} placeholder="Nat. Reg. No." />
                      <div className="input-group input-group-sm mb-2">
                        <input type="text" className="form-control" name="complainant.race" value={formData.complainant.race} onChange={handleInputChange} placeholder="Race" />
                        <select className="form-select" name="complainant.sex" value={formData.complainant.sex} onChange={handleInputChange}>
                          <option value="">Sex</option><option value="M">M</option><option value="F">F</option>
                        </select>
                        <input type="number" className="form-control" name="complainant.age" value={formData.complainant.age} onChange={handleInputChange} placeholder="Age" />
                      </div>
                      <input type="text" className="form-control form-control-sm mb-2" name="complainant.residentialAddress" value={formData.complainant.residentialAddress} onChange={handleInputChange} placeholder="Res. Address" />
                      <input type="text" className="form-control form-control-sm mb-2" name="complainant.residentialPhone" value={formData.complainant.residentialPhone} onChange={handleInputChange} placeholder="Res. Phone" />
                      <input type="text" className="form-control form-control-sm mb-2" name="complainant.businessAddress" value={formData.complainant.businessAddress} onChange={handleInputChange} placeholder="Bus. Address" />
                      <input type="text" className="form-control form-control-sm" name="complainant.businessPhone" value={formData.complainant.businessPhone} onChange={handleInputChange} placeholder="Bus. Phone" />
                    </div>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="card shadow-sm h-100 border-danger">
                    <div className="card-header bg-danger text-white py-2 small fw-bold">ACCUSED / SUSPECT</div>
                    <div className="card-body p-2">
                      <input type="text" className="form-control form-control-sm mb-2" name="accused.name" value={formData.accused.name} onChange={handleInputChange} placeholder="Full Name (if known)" />
                      <input type="text" className="form-control form-control-sm mb-2" name="accused.rcNr" value={formData.accused.rcNr} onChange={handleInputChange} placeholder="Nat. Reg. No." />
                      <div className="input-group input-group-sm mb-2">
                        <input type="text" className="form-control" name="accused.race" value={formData.accused.race} onChange={handleInputChange} placeholder="Race" />
                        <select className="form-select" name="accused.sex" value={formData.accused.sex} onChange={handleInputChange}>
                          <option value="">Sex</option><option value="M">M</option><option value="F">F</option>
                        </select>
                        <input type="number" className="form-control" name="accused.age" value={formData.accused.age} onChange={handleInputChange} placeholder="Age" />
                      </div>
                      <input type="text" className="form-control form-control-sm mb-2" name="accused.residentialAddress" value={formData.accused.residentialAddress} onChange={handleInputChange} placeholder="Res. Address" />
                      <input type="text" className="form-control form-control-sm mb-2" name="accused.residentialPhone" value={formData.accused.residentialPhone} onChange={handleInputChange} placeholder="Res. Phone" />
                      <input type="text" className="form-control form-control-sm mb-2" name="accused.businessAddress" value={formData.accused.businessAddress} onChange={handleInputChange} placeholder="Bus. Address" />
                      <input type="text" className="form-control form-control-sm" name="accused.businessPhone" value={formData.accused.businessPhone} onChange={handleInputChange} placeholder="Bus. Phone" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Investigation Details & Forensics ── */}
              <div className="card mb-4 shadow-sm border-info">
                <div className="card-header bg-info text-dark fw-bold">Details, Forensics & Findings</div>
                <div className="card-body p-3">
                  <div className="row g-2 mb-3">
                    <div className="col-md-6"><label className="small fw-bold">Value Stolen ($)</label><input type="text" className="form-control form-control-sm" name="valueStolen" value={formData.valueStolen} onChange={handleInputChange} /></div>
                    <div className="col-md-6"><label className="small fw-bold">Value Recovered ($)</label><input type="text" className="form-control form-control-sm" name="valueRecovered" value={formData.valueRecovered} onChange={handleInputChange} /></div>
                  </div>
                  
                  <div className="row g-2 mb-3 bg-light p-2 border rounded">
                    <div className="col-md-4">
                      <label className="small fw-bold d-block">Exhibits Held?</label>
                      <select className="form-select form-select-sm" name="exhibitsHeld" value={formData.exhibitsHeld} onChange={handleInputChange}>
                        <option value="NO">NO</option><option value="YES">YES</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="small fw-bold d-block">Fingerprints at Scene?</label>
                      <select className="form-select form-select-sm" name="fingerprintsFound" value={formData.fingerprintsFound} onChange={handleInputChange}>
                        <option value="NEG">NEG</option><option value="POS">POS</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="small fw-bold d-block">C.I.D. Reference</label>
                      <input type="text" className="form-control form-control-sm" name="cidReference" value={formData.cidReference} onChange={handleInputChange} />
                    </div>
                  </div>

                  <label className="small fw-bold">Brief Details of Offence</label>
                  <textarea className="form-control form-control-sm mb-2" name="briefDetails" value={formData.briefDetails} onChange={handleInputChange} rows={3}></textarea>
                  
                  <label className="small fw-bold">Modus Operandi</label>
                  <textarea className="form-control form-control-sm mb-2" name="modusOperandi" value={formData.modusOperandi} onChange={handleInputChange} rows={2}></textarea>
                  
                  <label className="small fw-bold text-success">Results / Findings (To C.C.B.)</label>
                  <textarea className="form-control form-control-sm" name="resultsFindings" value={formData.resultsFindings} onChange={handleInputChange} rows={2}></textarea>
                </div>
              </div>

              {/* ── Stolen Items (Form 169) ── */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header bg-dark text-white py-2 fw-bold">FORM 169: Stolen / Lost Property</div>
                <div className="card-body p-2">
                  <div className="row g-2 mb-2">
                    <div className="col-md-5"><input type="text" className="form-control form-control-sm" name="description" value={currentItem.description} onChange={handleItemChange} placeholder="Description of Stolen/Lost Property" /></div>
                    <div className="col-md-5"><input type="text" className="form-control form-control-sm" name="identifyingMarks" value={currentItem.identifyingMarks} onChange={handleItemChange} placeholder="Identifying Marks, Serial Nos., etc." /></div>
                    <div className="col-md-2"><button type="button" className="btn btn-sm btn-danger w-100" onClick={addStolenItem} disabled={!currentItem.description}>Add</button></div>
                  </div>
                  {formData.stolenItems.length > 0 && (
                    <table className="table table-sm table-bordered mt-3 text-center align-middle">
                      <thead className="table-light"><tr><th>Description</th><th>Marks / Serial</th><th>Date of Recovery</th><th></th></tr></thead>
                      <tbody>
                        {formData.stolenItems.map(item => (
                          <tr key={item.id} className={item.dateRecovered ? 'table-success' : ''}>
                            <td>{item.description}</td><td>{item.identifyingMarks}</td>
                            <td>{item.dateRecovered ? <span className="badge bg-success">{item.dateRecovered}</span> : <input type="date" className="form-control form-control-sm mx-auto" style={{width:130}} onChange={(e) => markAsRecovered(item.id, e.target.value)} />}</td>
                            <td><button type="button" className="btn btn-sm text-danger" onClick={() => removeStolenItem(item.id)}><i className="bi bi-trash"></i></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

            {/* ══ RIGHT COLUMN (Summary) ═══════════════════════════════════ */}
            <div className="col-lg-4">
              <div className="card shadow-sm sticky-top" style={{ top: 80 }}>
                <div className="card-header bg-success text-white py-2 fw-bold">Case Summary</div>
                <div className="card-body p-3">
                  <div className="mb-2"><strong className="small text-muted d-block">C.R. / L.P.B.</strong><span className="fw-bold">{formData.caseNumber}</span></div>
                  <div className="mb-2"><strong className="small text-muted d-block">Offence</strong><span>{formData.crimeTypeId ? crimeTypes.find(ct => String(ct.id) === String(formData.crimeTypeId))?.name : '—'}</span></div>
                  <div className="mb-2"><strong className="small text-muted d-block">Complainant</strong><span>{formData.complainant.name || '—'}</span></div>
                  <div className="mb-2"><strong className="small text-muted d-block">Accused</strong><span>{formData.accused.name || '—'}</span></div>
                  <hr/>
                  <div className="d-flex justify-content-between mb-1"><span className="small">Property Items:</span><span className="fw-bold">{formData.stolenItems.length}</span></div>
                  <div className="d-flex justify-content-between text-success"><span className="small">Recovered:</span><span className="fw-bold">{formData.stolenItems.filter(i => i.dateRecovered).length}</span></div>
                  <hr/>
                  <button type="submit" className="btn btn-primary w-100 mb-2" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary w-100" onClick={handleReset} disabled={submitting}>Clear Forms</button>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}

export default RRB;