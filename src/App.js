import React from "react";
// import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
// import Certificate from "./screens/Certificate";
import Aspire from "./screens/Aspire";
import Clarity from '@microsoft/clarity';
Clarity.init("oxf1beiydw");

const App = () => {
  return (
    // <Router>
    //   <Routes>
    //     <Route path="/" element={<Aspire />} />
    //     {/* <Route path="/:certificate" element={<Certificate />} /> */}
    //   </Routes>
    // </Router>
    <Aspire />
  );
};

export default App;
