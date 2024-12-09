// src/components/MyReservations.js
import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';

function MyReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError("로그인이 필요합니다.");
          setLoading(false);
          return;
        }

        const reservationsRef = collection(db, 'reservations');
        const q = query(reservationsRef, where('userId', '==', user.uid));
        const reservationSnapshot = await getDocs(q);

        const reservationList = reservationSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setReservations(reservationList);
        setLoading(false);
      } catch (err) {
        console.error("예약 조회 오류:", err);
        setError("예약 정보를 불러오는 데 문제가 발생했습니다.");
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  // 예약 취소 함수
  const handleCancelReservation = async (reservationId, busId, seatNumber) => {
    try {
      // reservations 컬렉션에서 해당 예약 삭제
      await deleteDoc(doc(db, 'reservations', reservationId));

      // buses 컬렉션에서 reserved_seats 업데이트 및 available_seats 증가
      const busDocRef = doc(db, 'buses', busId);
      
      // 현재 버스 문서 가져오기
      const busDoc = await getDoc(busDocRef);
      if (busDoc.exists()) {
        const currentAvailableSeats = busDoc.data().available_seats || 0;

        await updateDoc(busDocRef, {
          reserved_seats: arrayRemove(seatNumber),
          available_seats: currentAvailableSeats + 1,
        });

        // 예약 목록에서 삭제한 예약 제거
        setReservations((prevReservations) => 
          prevReservations.filter((reservation) => reservation.id !== reservationId)
        );

        alert("예약이 취소되었습니다.");
      } else {
        console.error("해당 버스 문서를 찾을 수 없습니다.");
        alert("예약 취소 중 문제가 발생했습니다.");
      }
    } catch (err) {
      console.error("예약 취소 오류:", err);
      alert("예약을 취소하는 데 문제가 발생했습니다.");
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-mint">내 예약</h1>
      {reservations.length === 0 ? (
        <p className="text-center text-lg">예약이 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {reservations.map((reservation) => (
            <li key={reservation.id} className="bg-white p-4 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold text-mint mb-2">
                {reservation.departure_location} → {reservation.arrival_location}
              </h2>
              <p>출발 시간: {reservation.departure_time}</p>
              <p>좌석 번호: {reservation.seatNumber}</p>
              <p>예약 날짜: {reservation.date}</p> {/* 선택한 탑승 날짜를 표시 */}
              <button
                onClick={() => handleCancelReservation(reservation.id, reservation.busId, reservation.seatNumber)}
                className="mt-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-semibold transition duration-300"
              >
                예약 취소
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyReservations;
