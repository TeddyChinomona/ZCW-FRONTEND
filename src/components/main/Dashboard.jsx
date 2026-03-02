import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  CategoryScale, 
  Chart, 
  LinearScale, 
  LineController, 
  LineElement, 
  PointElement,
  BarController,
  BarElement,
  PieController,
  ArcElement,
  DoughnutController,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import axios from 'axios';

// Register Chart.js components
Chart.register(
  CategoryScale, 
  LinearScale, 
  LineController, 
  LineElement, 
  PointElement,
  BarController,
  BarElement,
  PieController,
  ArcElement,
  DoughnutController,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  // Refs for chart canvases
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  
  // Refs for chart instances
  const lineChartInstance = useRef(null);
  const barChartInstance = useRef(null);
  const pieChartInstance = useRef(null);
  const doughnutChartInstance = useRef(null);
  
  // Ref for map instance
  const mapInstance = useRef(null);
  const mapContainerRef = useRef(null);

  useEffect(() => {
  // 1. Create an async function inside the effect
  const fetchCrimes = async () => {
    console.log('Fetching active cases from the backend...');
    
    try {
      const response = await axios.get('http://localhost:8000/zrp/crimes/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Response from backend:', response.data);
      
      // 4. Update your state here (e.g., setCrimes(response.data))
    } catch (error) {
      console.error('Error fetching crimes:', error.response?.data || error.message);
    }
  };

  fetchCrimes();
}, []);


  // Initialize charts
  useEffect(() => {
    // Cleanup function for charts
    const destroyCharts = () => {
      if (lineChartInstance.current) {
        lineChartInstance.current.destroy();
        lineChartInstance.current = null;
      }
      if (barChartInstance.current) {
        barChartInstance.current.destroy();
        barChartInstance.current = null;
      }
      if (pieChartInstance.current) {
        pieChartInstance.current.destroy();
        pieChartInstance.current = null;
      }
      if (doughnutChartInstance.current) {
        doughnutChartInstance.current.destroy();
        doughnutChartInstance.current = null;
      }
    };

    // Destroy existing charts before creating new ones
    destroyCharts();

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // Line Chart - Weekly Trend
      if (lineChartRef.current) {
        const ctx = lineChartRef.current.getContext('2d');
        if (ctx) {
          lineChartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Active Cases',
                data: [89, 95, 88, 92, 87, 91, 89],
                borderColor: 'blue',
                backgroundColor: 'rgba(0, 0, 255, 0.1)',
                tension: 0.3
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: 'Weekly Case Trend'
                }
              }
            }
          });
        }
      }

      // Bar Chart - Cases by Type
      if (barChartRef.current) {
        const ctx = barChartRef.current.getContext('2d');
        if (ctx) {
          barChartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['Theft', 'Assault', 'Burglary', 'Fraud', 'Vandalism', 'Other'],
              datasets: [{
                label: 'Number of Cases',
                data: [45, 32, 28, 19, 15, 24],
                backgroundColor: [
                  'rgba(255, 99, 132, 0.5)',
                  'rgba(54, 162, 235, 0.5)',
                  'rgba(255, 206, 86, 0.5)',
                  'rgba(75, 192, 192, 0.5)',
                  'rgba(153, 102, 255, 0.5)',
                  'rgba(255, 159, 64, 0.5)'
                ],
                borderColor: [
                  'rgb(255, 99, 132)',
                  'rgb(54, 162, 235)',
                  'rgb(255, 206, 86)',
                  'rgb(75, 192, 192)',
                  'rgb(153, 102, 255)',
                  'rgb(255, 159, 64)'
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: 'Cases by Type'
                }
              }
            }
          });
        }
      }

      // Pie Chart - Case Status Distribution
      if (pieChartRef.current) {
        const ctx = pieChartRef.current.getContext('2d');
        if (ctx) {
          pieChartInstance.current = new Chart(ctx, {
            type: 'pie',
            data: {
              labels: ['Active', 'Under Investigation', 'Solved', 'Closed'],
              datasets: [{
                data: [89, 45, 234, 78],
                backgroundColor: [
                  'rgba(255, 99, 132, 0.5)',
                  'rgba(54, 162, 235, 0.5)',
                  'rgba(75, 192, 192, 0.5)',
                  'rgba(255, 205, 86, 0.5)'
                ],
                borderColor: [
                  'rgb(255, 99, 132)',
                  'rgb(54, 162, 235)',
                  'rgb(75, 192, 192)',
                  'rgb(255, 205, 86)'
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: 'Case Status Distribution'
                }
              }
            }
          });
        }
      }

      // Doughnut Chart - Cases by Priority
      if (doughnutChartRef.current) {
        const ctx = doughnutChartRef.current.getContext('2d');
        if (ctx) {
          doughnutChartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ['High Priority', 'Medium Priority', 'Low Priority'],
              datasets: [{
                data: [45, 78, 123],
                backgroundColor: [
                  'rgba(255, 99, 132, 0.5)',
                  'rgba(255, 205, 86, 0.5)',
                  'rgba(75, 192, 192, 0.5)'
                ],
                borderColor: [
                  'rgb(255, 99, 132)',
                  'rgb(255, 205, 86)',
                  'rgb(75, 192, 192)'
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: 'Cases by Priority'
                }
              }
            }
          });
        }
      }
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      destroyCharts();
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    // Clean up existing map instance
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mapContainerRef.current && !mapInstance.current) {
        // Initialize map
        mapInstance.current = L.map(mapContainerRef.current).setView([-17.8252, 31.0335], 13);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstance.current);

        // Add some sample markers (you can replace with actual crime data)
        L.marker([-17.8252, 31.0335]).addTo(mapInstance.current)
          .bindPopup('Crime Hotspot')
          .openPopup();

        // Add a circle for demonstration
        L.circle([-17.8252, 31.0335], {
          color: 'red',
          fillColor: '#f03',
          fillOpacity: 0.5,
          radius: 500
        }).addTo(mapInstance.current).bindPopup('High Crime Area');
      }
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="topbar container-fluid">
      <header className="d-flex justify-content-between align-items-center py-0 border-bottom">
          <div className='my-0'>
            <h1 className="display-6 fw-bold" style={{ color: '#2c3e50' }}>
                <i className="bi bi-display me-3 text-primary"></i>
                Dashboard
            </h1>
          </div>
          <div className="user-profile py-2 px-0 ">
            <span className="badge bg-primary text-dark rounded-2">Admin User</span>
          </div>
      </header>

      <div className="py-2">
        {/* Summary Cards */}
        <div className="row border-bottom border-top mb-4 py-3">
          <div className="col-md-3">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h6 className="card-title text-muted">Active Cases</h6>
                <h3>89</h3>
                <small className="text-success">↑ 12%</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h6 className="card-title text-muted">Solved Cases</h6>
                <h3>234</h3>
                <small className="text-success">↑ 8%</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h6 className="card-title text-muted">Pending</h6>
                <h3>45</h3>
                <small className="text-danger">↓ 3%</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h6 className="card-title text-muted">Total Cases</h6>
                <h3>446</h3>
                <small className="text-success">↑ 5%</small>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="row mb-4">
          {/* Line Chart */}
          <div className="col-md-6 mb-4">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h6 className="card-title text-muted mb-3">Weekly Trend</h6>
                <div style={{ height: '250px' }}>
                  <canvas ref={lineChartRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="col-md-6 mb-4">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h6 className="card-title text-muted mb-3">Cases by Type</h6>
                <div style={{ height: '250px' }}>
                  <canvas ref={barChartRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="col-md-6 mb-4">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h6 className="card-title text-muted mb-3">Case Status</h6>
                <div style={{ height: '250px' }}>
                  <canvas ref={pieChartRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Doughnut Chart */}
          <div className="col-md-6 mb-4">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h6 className="card-title text-muted mb-3">Priority Distribution</h6>
                <div style={{ height: '250px' }}>
                  <canvas ref={doughnutChartRef} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h5 className="card-title mb-3">Crime Map</h5>
                <div 
                  ref={mapContainerRef}
                  id="map" 
                  style={{ height: '400px', width: '100%', borderRadius: '4px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>  
  );
}

export default Dashboard;