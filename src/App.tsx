import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Demo from "@/pages/Demo";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demo/:id" element={<Demo />} />
      </Routes>
    </Router>
  );
}
