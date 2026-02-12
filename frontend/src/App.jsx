import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Series from "./pages/Series";
import Login from "./components/Login";
import SearchResults from "./pages/SearchResults";
import SignUp from "./components/SignUp";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import GenrePage from "./pages/GenrePage";


export default function App() {
  return (
    <Router>

      <Navbar />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/series" element={<Series />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collection/:id" element={<CollectionDetail />} />
        <Route path="/genre/:genre" element={<GenrePage />} />

      </Routes>

    </Router>
  );
}
