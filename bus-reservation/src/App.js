// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import BusSelection from './components/BusSelection';
import SeatSelection from './components/SeatSelection';
import MyReservations from './components/MyReservations';
import Layout from './components/Layout';
import AdminPage from './components/AdminPage';
import AddBus from './components/AddBus';
import ViewReservations from './components/ViewReservations';
import UserAccounts from './components/UserAccounts';
import ManageBuses from './components/ManageBuses';
import SelectDate from './components/SelectDate'; // 날짜 선택 컴포넌트 임포트
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import ResetPassword from './components/ResetPassword';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (
        user &&
        (user.uid === 'MFKZKSQJ0tOJFLrgaZwVAdVQaXf1' ||
          user.uid === 'PDkskHSVhAYS5ubB4uxyrlFi6f83' ||
          user.uid === 'uXllDblsZ7aeU0mbMoMw2dgJXoa2')
      ) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
  
    return () => unsubscribe();
  }, []);
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reservation" element={<Layout isAdmin={isAdmin}><BusSelection /></Layout>} />
        <Route path="/reservation/:busId/select-seat" element={<Layout isAdmin={isAdmin}><SeatSelection /></Layout>}/>
        <Route path="/reservation/:busId/select-date" element={<Layout isAdmin={isAdmin}><SelectDate /></Layout>} /> {/* 날짜 선택 경로 추가 */}
        <Route path="/reservation/:busId" element={<Layout isAdmin={isAdmin}><SeatSelection /></Layout>} />
        <Route path="/my-reservations" element={<Layout isAdmin={isAdmin}><MyReservations /></Layout>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {isAdmin && (
          <>
            <Route path="/admin" element={<Layout isAdmin={isAdmin}><AdminPage /></Layout>} />
            <Route path="/admin/add-bus" element={<Layout isAdmin={isAdmin}><AddBus /></Layout>} />
            <Route path="/admin/view-reservations" element={<Layout isAdmin={isAdmin}><ViewReservations /></Layout>} />
            <Route path="/admin/user-accounts" element={<Layout isAdmin={isAdmin}><UserAccounts /></Layout>} />
            <Route path="/admin/manage-buses" element={<Layout isAdmin={isAdmin}><ManageBuses /></Layout>} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
