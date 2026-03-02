import { useState } from "react";
import SideBar from "./SideBar";
import Container from "./Container";

function NavBar() {
  const [activeComponent, setActiveComponent] = useState("Dashboard");

  return (
    <div className="navbar row g-0 p-0 m-0">
      <SideBar 
        setActiveComponent={setActiveComponent} 
        activeComponent={activeComponent} 
      />
      <Container activeComponent={activeComponent} />
    </div>
  );
}

export default NavBar;