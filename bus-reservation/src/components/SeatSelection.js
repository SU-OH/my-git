import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useParams, useLocation } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

function SeatSelection() {
  const { busId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedTime = searchParams.get('time');
  const selectedDate = searchParams.get('date');

  const [bus, setBus] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBusData = async () => {
      try {
        const busDocRef = doc(db, 'buses', busId);
        const busDoc = await getDoc(busDocRef);

        if (busDoc.exists()) {
          const busData = busDoc.data();
          const reservedSeats =
            busData.reserved_seats?.[selectedDate]?.[selectedTime] || [];
          setBus({ ...busData, reserved_seats: reservedSeats });
        } else {
          setError('해당 버스 노선이 존재하지 않습니다.');
        }
        setLoading(false);
      } catch (err) {
        console.error('버스 데이터 가져오기 오류:', err);
        setError('버스 정보를 불러오는 데 문제가 발생했습니다.');
        setLoading(false);
      }
    };

    fetchBusData();
  }, [busId, selectedDate, selectedTime]);

  const handleSeatSelect = async () => {
    if (!selectedSeat) {
      alert('좌석을 선택해주세요.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }

      const reservationsRef = collection(db, 'reservations');
      const q = query(reservationsRef, where('userId', '==', user.uid));
      const reservationSnapshot = await getDocs(q);

      if (reservationSnapshot.size >= 2) {
        alert('최대 2개의 예약만 가능합니다.');
        return;
      }

      const reservationData = {
        userId: user.uid,
        busId,
        seatNumber: selectedSeat,
        reservedAt: new Date(),
        departure_location: bus.departure_location,
        arrival_location: bus.arrival_location,
        departure_time: selectedTime,
        date: selectedDate,
      };

      await addDoc(collection(db, 'reservations'), reservationData);

      await updateDoc(doc(db, 'buses', busId), {
        [`reserved_seats.${selectedDate}.${selectedTime}`]: arrayUnion(
          selectedSeat
        ),
      });

      alert('좌석이 예약되었습니다.');
      setSelectedSeat(null);
      setBus((prevBus) => ({
        ...prevBus,
        reserved_seats: [...prevBus.reserved_seats, selectedSeat],
      }));
    } catch (err) {
      console.error('좌석 예약 오류:', err);
      alert('좌석을 예약하는 데 문제가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mint-light">
        <p className="text-xl">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mint-light">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  // 좌석 배열 생성 (2+2 배열)
  const totalSeats = bus.total_seats;
  const rows = [];
  const seatsPerRow = 4;

  for (let i = 1; i <= totalSeats; i += seatsPerRow) {
    const row = Array.from({ length: seatsPerRow }, (_, j) =>
      i + j <= totalSeats ? i + j : null
    );
    rows.push(row);
  }

  const lastRow = rows[rows.length - 1];
  if (lastRow.filter((seat) => seat !== null).length <= 4) {
    rows[rows.length - 1] = [null, ...lastRow.filter((seat) => seat !== null), null];
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-mint">좌석 선택</h1>
      <h2 className="text-2xl mb-4 text-center">
        {bus.departure_location} → {bus.arrival_location}
      </h2>
      <p className="text-center mb-6">출발 시간: {selectedTime}</p>
      <p className="text-center mb-6">예약 날짜: {selectedDate}</p>

      <div className="flex justify-center mb-6">
        <div className="grid gap-4">
          {rows.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex justify-center space-x-4">
              {row.map((seat, seatIndex) => {
                const isReserved = bus.reserved_seats.includes(seat);
                return seat === null ? (
                  <div
                    key={`empty-${rowIndex}-${seatIndex}`}
                    className="w-16 h-16"
                  ></div>
                ) : (
                  <button
                    key={`seat-${seat}`}
                    onClick={() => !isReserved && setSelectedSeat(seat)}
                    className={`w-16 h-16 rounded-lg 
                      ${
                        isReserved
                          ? 'bg-gray-400 cursor-not-allowed'
                          : selectedSeat === seat
                          ? 'bg-mint-dark'
                          : 'bg-mint'
                      }
                      text-white font-semibold
                      hover:bg-mint-dark transition duration-300`}
                    disabled={isReserved}
                  >
                    {seat}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        {selectedSeat && (
          <p className="mb-4 text-lg">
            선택한 좌석: <span className="font-bold">{selectedSeat}</span>
          </p>
        )}
        <button
          onClick={handleSeatSelect}
          className="bg-mint hover:bg-mint-dark text-white py-2 px-6 rounded-lg font-semibold transition duration-300"
        >
          예약하기
        </button>
      </div>
    </div>
  );
}

export default SeatSelection;
