import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import DriverMap from './pages/DriverMap.jsx';
import HostDashboard from './pages/HostDashboard.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import BookingHistory from './pages/BookingHistory.jsx';
import ListingDetail from './pages/ListingDetail.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-chalk">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/search" element={<DriverMap />} />
          <Route path="/host" element={<HostDashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/bookings" element={<BookingHistory />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
        </Routes>
      </main>
    </div>
  );
}
