import { useState } from "react";

function RRB() {

    const [formData, setFormData] = useState({
        station: '',
        section: '',
        crLpb: '',
        complainant: {
        rcNr: '',
        residentialAddress: '',
        residentialPhone: '',
        businessAddress: '',
        businessPhone: ''
        },
        offence: '',
        timeDateCommitted: '',
        sceneOfCrime: '',
        briefDetails: '',
        stolenItems: [],
        investigatingOfficer: ''
    });

    const [currentItem, setCurrentItem] = useState({
        description: '',
        identifyingMarks: '',
        dateRecovered: ''
    });

    const [showRecoverySection, setShowRecoverySection] = useState(false);
    const [cancellationOfficer, setCancellationOfficer] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setFormData(prev => ({
            ...prev,
            [parent]: {
            ...prev[parent],
            [child]: value
            }
        }));
        } else {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        }
    };

    const handleItemChange = (e) => {
        const { name, value } = e.target;
        setCurrentItem(prev => ({
        ...prev,
        [name]: value
        }));
    };

    const addStolenItem = () => {
        if (currentItem.description && currentItem.identifyingMarks) {
        setFormData(prev => ({
            ...prev,
            stolenItems: [...prev.stolenItems, { ...currentItem, id: Date.now() }]
        }));
        setCurrentItem({
            description: '',
            identifyingMarks: '',
            dateRecovered: ''
        });
        }
    };

    const removeStolenItem = (id) => {
        setFormData(prev => ({
        ...prev,
        stolenItems: prev.stolenItems.filter(item => item.id !== id)
        }));
    };

    const markAsRecovered = (id, date) => {
        setFormData(prev => ({
        ...prev,
        stolenItems: prev.stolenItems.map(item => 
            item.id === id ? { ...item, dateRecovered: date } : item
        )
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        // Here you would typically send the data to your backend
        alert('Report submitted successfully!');
    };

    // const handlePrint = () => {
    //     window.print();
    // };

    // const handleExportPDF = () => {
    //     // This would integrate with a PDF generation library
    //     alert('PDF export functionality would be implemented here');
    // };


    return (
        <div class="topbar container-fluid">
            <header className="d-flex justify-content-between align-items-center py-0 border-bottom">
                <div className='my-0'>
                    <h1 className="display-6 fw-bold" style={{ color: '#2c3e50' }}>
                        <i className="bi bi-book me-3 text-primary"></i>
                        Report Record Book(R.R.B.)
                    </h1>
                </div>
                <div className="user-profile py-2 px-0 ">
                    <span className="badge bg-primary text-dark rounded-2">Admin User</span>
                </div>
            </header>

            <div className="py-2">
                <div className="">
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            {/* Left Column - Form Fields */}
                            <div className="col-md-8">
                            {/* Station Details Card */}
                            <div className="card mb-4 shadow-sm">
                                <div className="card-header bg-primary text-white">
                                <h5 className="mb-0">Station Details</h5>
                                </div>
                                <div className="card-body">
                                <div className="row">
                                    <div className="col-md-4 mb-3">
                                    <label className="form-label">Station</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="station"
                                        value={formData.station}
                                        onChange={handleInputChange}
                                        placeholder="Enter station name"
                                    />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                    <label className="form-label">Section</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="section"
                                        value={formData.section}
                                        onChange={handleInputChange}
                                        placeholder="Enter section"
                                    />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                    <label className="form-label">C.R./L.P.B.</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="crLpb"
                                        value={formData.crLpb}
                                        onChange={handleInputChange}
                                        placeholder="Enter reference number"
                                    />
                                    </div>
                                </div>
                                </div>
                            </div>

                            {/* Complainant Details Card */}
                            <div className="card mb-4 shadow-sm">
                                <div className="card-header bg-primary text-white">
                                <h5 className="mb-0">Complainant Information</h5>
                                </div>
                                <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                    <label className="form-label">R.C./N.R. No.</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="complainant.rcNr"
                                        value={formData.complainant.rcNr}
                                        onChange={handleInputChange}
                                        placeholder="Enter ID/Reference number"
                                    />
                                    </div>
                                </div>
                                
                                <h6 className="mt-3 mb-2">Residential Address</h6>
                                <div className="row">
                                    <div className="col-md-8 mb-3">
                                    <label className="form-label">Address</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="complainant.residentialAddress"
                                        value={formData.complainant.residentialAddress}
                                        onChange={handleInputChange}
                                        placeholder="Street address"
                                    />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                    <label className="form-label">Phone No.</label>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        name="complainant.residentialPhone"
                                        value={formData.complainant.residentialPhone}
                                        onChange={handleInputChange}
                                        placeholder="Phone number"
                                    />
                                    </div>
                                </div>

                                <h6 className="mt-2 mb-2">Business Address</h6>
                                <div className="row">
                                    <div className="col-md-8 mb-3">
                                    <label className="form-label">Address</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="complainant.businessAddress"
                                        value={formData.complainant.businessAddress}
                                        onChange={handleInputChange}
                                        placeholder="Business address"
                                    />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                    <label className="form-label">Phone No.</label>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        name="complainant.businessPhone"
                                        value={formData.complainant.businessPhone}
                                        onChange={handleInputChange}
                                        placeholder="Business phone"
                                    />
                                    </div>
                                </div>
                                </div>
                            </div>

                            {/* Offence Details Card */}
                            <div className="card mb-4 shadow-sm">
                                <div className="card-header bg-primary text-white">
                                <h5 className="mb-0">Offence Details</h5>
                                </div>
                                <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                    <label className="form-label">Offence</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="offence"
                                        value={formData.offence}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Theft, Burglary"
                                    />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                    <label className="form-label">Time and Date Committed</label>
                                    <input
                                        type="datetime-local"
                                        className="form-control"
                                        name="timeDateCommitted"
                                        value={formData.timeDateCommitted}
                                        onChange={handleInputChange}
                                    />
                                    </div>
                                </div>
                                
                                <div className="mb-3">
                                    <label className="form-label">Scene of Crime</label>
                                    <input
                                    type="text"
                                    className="form-control"
                                    name="sceneOfCrime"
                                    value={formData.sceneOfCrime}
                                    onChange={handleInputChange}
                                    placeholder="Residence, Shop, Office, etc."
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Brief details of offence and modus operandi</label>
                                    <textarea
                                    className="form-control"
                                    name="briefDetails"
                                    value={formData.briefDetails}
                                    onChange={handleInputChange}
                                    rows="4"
                                    placeholder="Provide detailed description of the incident..."
                                    />
                                </div>
                                </div>
                            </div>
                            </div>

                            {/* Right Column - Quick Stats */}
                            <div className="col-md-4">
                            <div className="card mb-4 shadow-sm">
                                <div className="card-header bg-success text-white">
                                <h5 className="mb-0">Case Summary</h5>
                                </div>
                                <div className="card-body">
                                <div className="mb-3">
                                    <strong>Total Items Reported:</strong>
                                    <h2 className="text-primary">{formData.stolenItems.length}</h2>
                                </div>
                                <div className="mb-3">
                                    <strong>Recovered Items:</strong>
                                    <h2 className="text-success">
                                    {formData.stolenItems.filter(item => item.dateRecovered).length}
                                    </h2>
                                </div>
                                <div className="mb-3">
                                    <strong>Pending Recovery:</strong>
                                    <h2 className="text-warning">
                                    {formData.stolenItems.filter(item => !item.dateRecovered).length}
                                    </h2>
                                </div>
                                </div>
                            </div>

                            {/* Investigating Officer Card */}
                            <div className="card mb-4 shadow-sm">
                                <div className="card-header bg-info text-white">
                                <h5 className="mb-0">Investigating Officer</h5>
                                </div>
                                <div className="card-body">
                                <input
                                    type="text"
                                    className="form-control"
                                    name="investigatingOfficer"
                                    value={formData.investigatingOfficer}
                                    onChange={handleInputChange}
                                    placeholder="Officer name & ID"
                                />
                                <small className="text-muted d-block mt-2">
                                    Note: This form must be submitted to C.R.O. in triplicate
                                </small>
                                </div>
                            </div>
                            </div>
                        </div>

                        {/* Stolen Items Table */}
                        <div className="card mb-4 shadow-sm">
                            <div className="card-header bg-warning text-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Stolen/Lost Property</h5>
                            <div className="d-flex">
                                <input
                                type="checkbox"
                                className="form-check-input me-2"
                                checked={showRecoverySection}
                                onChange={(e) => setShowRecoverySection(e.target.checked)}
                                id="showRecovery"
                                />
                                <label htmlFor="showRecovery" className="text-white">Show Recovery Dates</label>
                            </div>
                            </div>
                            <div className="card-body">
                            {/* Add New Item Form */}
                            <div className="row mb-4 p-3 border rounded bg-light">
                                <div className="col-md-5 mb-2">
                                <label className="form-label">Description of Property</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="description"
                                    value={currentItem.description}
                                    onChange={handleItemChange}
                                    placeholder="e.g., Laptop, Phone, Vehicle"
                                />
                                </div>
                                <div className="col-md-4 mb-2">
                                <label className="form-label">Identifying Marks/Serial Nos.</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="identifyingMarks"
                                    value={currentItem.identifyingMarks}
                                    onChange={handleItemChange}
                                    placeholder="Serial number, marks"
                                />
                                </div>
                                {showRecoverySection && (
                                <div className="col-md-3 mb-2">
                                    <label className="form-label">Date of Recovery</label>
                                    <input
                                    type="date"
                                    className="form-control"
                                    name="dateRecovered"
                                    value={currentItem.dateRecovered}
                                    onChange={handleItemChange}
                                    />
                                </div>
                                )}
                                <div className="col-12 mt-2">
                                <button type="button" className="btn btn-success" onClick={addStolenItem}>
                                    <i className="bi bi-plus-circle"></i> Add Item
                                </button>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="table-responsive">
                                <table className="table table-bordered table-hover">
                                <thead className="table-dark">
                                    <tr>
                                    <th>Description of Stolen/Lost Property</th>
                                    <th>Identifying Marks, Serial Nos., etc.</th>
                                    {showRecoverySection && <th>Date of Recovery</th>}
                                    <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.stolenItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={showRecoverySection ? 4 : 3} className="text-center text-muted py-4">
                                        No items added yet. Use the form above to add stolen/lost property.
                                        </td>
                                    </tr>
                                    ) : (
                                    formData.stolenItems.map((item) => (
                                        <tr key={item.id}>
                                        <td>{item.description}</td>
                                        <td>{item.identifyingMarks}</td>
                                        {showRecoverySection && (
                                            <td>
                                            {item.dateRecovered ? (
                                                <span className="text-success">{item.dateRecovered}</span>
                                            ) : (
                                                <input
                                                type="date"
                                                className="form-control form-control-sm"
                                                onChange={(e) => markAsRecovered(item.id, e.target.value)}
                                                placeholder="Not recovered"
                                                />
                                            )}
                                            </td>
                                        )}
                                        <td>
                                            <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => removeStolenItem(item.id)}
                                            >
                                            <i className="bi bi-trash"></i> Remove
                                            </button>
                                        </td>
                                        </tr>
                                    ))
                                    )}
                                </tbody>
                                </table>
                            </div>
                            <p className="text-muted mt-2 mb-0">
                                <small>* If necessary, continue overleaf</small>
                            </p>
                            </div>
                        </div>

                        {/* Cancellation Section */}
                        <div className="card mb-4 shadow-sm">
                            <div className="card-header bg-secondary text-white">
                            <h5 className="mb-0">CANCELLATION</h5>
                            </div>
                            <div className="card-body">
                            <div className="row">
                                <div className="col-md-8">
                                <label className="form-label">Officer/Member i/c, C.R.O., C.I.D.</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={cancellationOfficer}
                                    onChange={(e) => setCancellationOfficer(e.target.value)}
                                    placeholder="Enter officer name"
                                />
                                </div>
                                <div className="col-md-4 d-flex align-items-end">
                                <p className="text-muted mb-0">
                                    Please note the recovery of items marked above.
                                </p>
                                </div>
                            </div>
                            </div>
                        </div>

                        {/* Instructions Card */}
                        <div className="card mb-4 border-info">
                            <div className="card-header bg-info text-white">
                            <h5 className="mb-0">INVESTIGATING OFFICER NOTES</h5>
                            </div>
                            <div className="card-body">
                            <div className="alert alert-info mb-0">
                                <i className="bi bi-info-circle-fill me-2"></i>
                                <strong>NOTE:</strong> This form is to be submitted to C.R.O. in triplicate. 
                                One copy will be returned to the Investigating Officer indicating that carding 
                                has been effected. In the event of some or all of the stolen property being 
                                recovered, the date will be entered in the "recovery" column opposite recovered 
                                items and the form forwarded to C.R.O. for amendment of their records.
                            </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="row mb-4">
                            <div className="col-12 text-center">
                            <button type="submit" className="btn btn-primary btn-lg px-5">
                                <i className="bi bi-check-circle"></i> Submit Report
                            </button>
                            <button type="reset" className="btn btn-secondary btn-lg px-5 ms-3">
                                <i className="bi bi-x-circle"></i> Clear Form
                            </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default RRB;