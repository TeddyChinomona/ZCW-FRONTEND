import logo from "/logo.jpg";

function SideBar({ setActiveComponent, activeComponent }) {
  const menuItems = [
    "Dashboard",
    "RRB",
    "CPM",
    "Analytics",
    "Statistics",
    "Reports",
    "Settings",
  ];

  return (
    <div className="sidebar col-2">
      <div className="d-flex logo align-items-center">
        <img src={logo} alt="Zim Crime Watch Logo" />
        <h1 className="text-center">Zim Crime Watch</h1>
      </div>
      <ul className="menu">
        {menuItems.map((item) => (
          <li
            className={item === activeComponent ? "text-light text-uppercase fs-6 active" : "text-light text-uppercase fs-6"}
            key={item}
            onClick={() => {
              setActiveComponent(item);
              console.log(item);
            }}
          >
            {item}
          </li>
        ))}
      </ul>
      <footer className="text-center p-3">
        <div className="d-flex justify-content-between align-items-center">
          <div className="border border-secondary rounded-2 d-flex align-items-center">
            <p className="py-1 px-4 ">Username</p>
          </div>
          <p className="badge bg-primary">Admin</p>
        </div>
      </footer>
    </div>
  );
}

export default SideBar;