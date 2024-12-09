// src/components/ManageBuses.js
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

function ManageBuses() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const busesSnapshot = await getDocs(collection(db, 'buses'));
        const busesList = busesSnapshot.docs.map((busDoc) => ({
          id: busDoc.id,
          ...busDoc.data(),
        }));
        setBuses(busesList);
        setLoading(false);
      } catch (error) {
        console.error("버스 데이터 가져오기 오류:", error);
        setLoading(false);
      }
    };

    fetchBuses();
  }, []);

  // 출발 위치와 도착 위치에 따라 버스를 그룹화하고 출발 시간을 정렬
  const groupedBuses = buses.reduce((acc, bus) => {
    const key = `${bus.departure_location} → ${bus.arrival_location}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(bus);
    return acc;
  }, {});

  // 그룹 내 출발 시간을 빠른 순으로 정렬
  Object.values(groupedBuses).forEach((busGroup) => {
    busGroup.sort((a, b) => {
      const [aHour, aMinute] = a.departure_time.split(':').map(Number);
      const [bHour, bMinute] = b.departure_time.split(':').map(Number);
      return aHour - bHour || aMinute - bMinute;
    });
  });

  const handleUpdateBus = async (busId, updatedFields) => {
    try {
      const busRef = doc(db, 'buses', busId);
      await updateDoc(busRef, updatedFields);
      setMessage("버스 정보가 성공적으로 업데이트되었습니다.");
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("버스 업데이트 오류:", error);
      setMessage("버스 정보를 업데이트하는 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteBus = async (busId) => {
    if (window.confirm("이 버스를 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'buses', busId));
        setBuses((prevBuses) => prevBuses.filter((bus) => bus.id !== busId));
        setMessage("버스가 성공적으로 삭제되었습니다.");
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        console.error("버스 삭제 오류:", error);
        setMessage("버스를 삭제하는 중 오류가 발생했습니다.");
      }
    }
  };

  const handleInputChange = (e, busId, field) => {
    setBuses((prevBuses) =>
      prevBuses.map((bus) =>
        bus.id === busId ? { ...bus, [field]: e.target.value } : bus
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mint-light">
        <p className="text-xl">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-mint">버스 노선 관리</h1>
      {message && <p className="text-green-500 text-center mb-4">{message}</p>}

      {Object.entries(groupedBuses).map(([route, busGroup]) => (
        <div key={route} className="mb-10">
          <h2 className="text-2xl font-semibold text-center text-mint mb-4">{route}</h2>
          <div className="space-y-6">
            {busGroup.map((bus) => (
              <div key={bus.id} className="bg-white p-4 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-2 text-mint">버스 ID: {bus.id}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700">출발 위치</label>
                    <input
                      type="text"
                      value={bus.departure_location}
                      onChange={(e) => handleInputChange(e, bus.id, 'departure_location')}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">도착 위치</label>
                    <input
                      type="text"
                      value={bus.arrival_location}
                      onChange={(e) => handleInputChange(e, bus.id, 'arrival_location')}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">출발 시간</label>
                    <input
                      type="time"
                      value={bus.departure_time}
                      onChange={(e) => handleInputChange(e, bus.id, 'departure_time')}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">총 좌석 수</label>
                    <input
                      type="number"
                      value={bus.total_seats}
                      onChange={(e) => handleInputChange(e, bus.id, 'total_seats')}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex space-x-4 mt-4">
                    <button
                      onClick={() =>
                        handleUpdateBus(bus.id, {
                          departure_location: bus.departure_location,
                          arrival_location: bus.arrival_location,
                          departure_time: bus.departure_time,
                          total_seats: parseInt(bus.total_seats, 10),
                        })
                      }
                      className="bg-mint hover:bg-mint-dark text-white py-2 px-6 rounded-lg font-semibold transition duration-300"
                    >
                      업데이트
                    </button>
                    <button
                      onClick={() => handleDeleteBus(bus.id)}
                      className="bg-red-500 hover:bg-red-600 text-white py-2 px-6 rounded-lg font-semibold transition duration-300"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ManageBuses;
