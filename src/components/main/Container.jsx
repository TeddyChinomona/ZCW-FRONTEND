import Dashboard from "./Dashboard";
import RRB from "./home_components/RRB";
import CrimeProfileMatcher from "./home_components/CrimeProfileMatcher";
import Analytics from "./home_components/Analytics";
import Statistics from "./home_components/Statistics";
import Reports from "./home_components/Reports";
import CSVUpload from "./home_components/CSVUpload";
import MLTraining from "./home_components/MLTraining";
import Settings from "./home_components/Settings";

function Container({ activeComponent }) {
  const components = {
    Dashboard: <Dashboard />,
    RRB: <RRB />,
    CPM: <CrimeProfileMatcher />,
    Analytics: <Analytics />,
    Statistics: <Statistics />,
    "Data Upload": <CSVUpload />,
    "ML Training": <MLTraining />,
    Reports: <Reports />,
    Settings: <Settings />
  };

  return (
    <div className="col-10">
      {components[activeComponent] || <Dashboard />}
    </div>
  );
}

export default Container;