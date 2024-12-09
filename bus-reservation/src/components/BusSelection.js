import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';

function BusSelection() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const busesSnapshot = await getDocs(collection(db, 'buses'));
        const busesList = busesSnapshot.docs.map((doc) => {
          const data = doc.data();
          if (!data.departure_location || !data.arrival_location || !data.departure_time) {
            console.warn('누락된 필드가 있는 버스 데이터:', data);
            return null; // 누락된 필드가 있는 데이터는 제외
          }
          return { id: doc.id, ...data };
        }).filter((bus) => bus !== null); // 유효하지 않은 데이터를 필터링
        setBuses(busesList);
        setLoading(false);
      } catch (err) {
        console.error('버스 데이터 가져오기 오류:', err);
        setError('버스 정보를 불러오는 데 문제가 발생했습니다.');
        setLoading(false);
      }
    };

    fetchBuses();
  }, []);

  const groupedBuses = buses.length > 0 ? buses.reduce((acc, bus) => {
    const key = `${bus.departure_location}-${bus.arrival_location}`;
    if (!acc[key]) {
      acc[key] = { ...bus, times: new Set() };
    }
    acc[key].times.add(bus.departure_time);
    return acc;
  }, {}) : {};

  Object.values(groupedBuses).forEach((bus) => {
    bus.times = Array.from(bus.times).sort((a, b) => {
      const parseTime = (time) => {
        const [hour, minute] = (time || '00:00').split(':').map(Number);
        return hour * 60 + minute;
      };
      return parseTime(a) - parseTime(b);
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mint-light">
        <p className="text-xl">로딩 중...</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-mint text-white rounded"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mint-light">
        <p className="text-xl text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-mint">예약하기</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-center text-mint mb-4">등교 노선</h2>
          {Object.entries(groupedBuses).map(([key, bus]) => (
            bus.departure_location !== '한서대학교' && (
              <div key={key} className="bg-white p-4 rounded-lg shadow-lg mb-4">
                <h3 className="text-xl font-semibold text-mint">
                  {bus.departure_location} → {bus.arrival_location}
                </h3>
                <div className="mt-2 space-y-2">
                  {bus.times.map((time) => (
                    <Link
                      key={`${bus.id}-${time}`}
                      to={`/reservation/${bus.id}/select-date?time=${time}`}
                      className="block bg-mint hover:bg-mint-dark text-white py-2 px-4 rounded text-center"
                    >
                      출발 시간: {time}
                    </Link>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-center text-mint mb-4">하교 노선</h2>
          {Object.entries(groupedBuses).map(([key, bus]) => (
            bus.departure_location === '한서대학교' && (
              <div key={key} className="bg-white p-4 rounded-lg shadow-lg mb-4">
                <h3 className="text-xl font-semibold text-mint">
                  {bus.departure_location} → {bus.arrival_location}
                </h3>
                <div className="mt-2 space-y-2">
                  {bus.times.map((time) => (
                    <Link
                      key={`${bus.id}-${time}`}
                      to={`/reservation/${bus.id}?time=${time}`}
                      className="block bg-mint hover:bg-mint-dark text-white py-2 px-4 rounded text-center"
                    >
                      출발 시간: {time}
                    </Link>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

export default BusSelection;
