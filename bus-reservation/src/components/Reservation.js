import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function Reservation() {
  const [routes, setRoutes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoutes = async () => {
      const routesCollection = collection(db, 'busRoutes');
      const routesSnapshot = await getDocs(routesCollection);
      const routesList = routesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRoutes(routesList);
    };
    fetchRoutes();
  }, []);

  const handleRouteSelect = (routeId) => {
    navigate(`/reservation/${routeId}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">버스 노선 선택</h1>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {routes.map((route) => (
          <li key={route.id}>
            <button
              onClick={() => handleRouteSelect(route.id)}
              className="w-full bg-mint text-white p-4 rounded hover:bg-mint-dark"
            >
              {route.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Reservation;
