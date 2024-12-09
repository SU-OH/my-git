// src/components/AddBus.js
import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

function AddBus() {
  const [departureLocation, setDepartureLocation] = useState('');
  const [arrivalLocation, setArrivalLocation] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [message, setMessage] = useState('');

  const handleAddBus = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'buses'), {
        departure_location: departureLocation,
        arrival_location: arrivalLocation,
        departure_time: departureTime,
        total_seats: parseInt(totalSeats),
        available_seats: parseInt(totalSeats),
        reserved_seats: [],
      });

      setMessage('버스가 성공적으로 추가되었습니다.');
      setDepartureLocation('');
      setArrivalLocation('');
      setDepartureTime('');
      setTotalSeats('');
    } catch (error) {
      console.error('버스 추가 오류:', error);
      setMessage('버스를 추가하는 데 실패했습니다.');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h2 className="text-2xl font-semibold mb-4">버스 추가</h2>
      {message && <p className="text-green-500 mb-4">{message}</p>}
      <form onSubmit={handleAddBus} className="max-w-md">
        <div className="mb-4">
          <label className="block text-gray-700">출발 위치</label>
          <input
            type="text"
            value={departureLocation}
            onChange={(e) => setDepartureLocation(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">도착 위치</label>
          <input
            type="text"
            value={arrivalLocation}
            onChange={(e) => setArrivalLocation(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">출발 시간</label>
          <input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">총 좌석 수</label>
          <input
            type="number"
            value={totalSeats}
            onChange={(e) => setTotalSeats(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-mint hover:bg-mint-dark text-white py-2 px-6 rounded-lg font-semibold transition duration-300"
        >
          버스 추가
        </button>
      </form>
    </div>
  );
}

export default AddBus;
