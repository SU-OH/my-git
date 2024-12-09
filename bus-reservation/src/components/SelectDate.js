import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

function SelectDate() {
  const { busId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedTime = searchParams.get('time'); // 선택된 시간 가져오기

  const [selectedDate, setSelectedDate] = useState('');
  const navigate = useNavigate();

  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      options.push(date.toISOString().split('T')[0]);
    }
    return options;
  };

  const handleDateSelect = () => {
    if (selectedDate) {
      // 좌석 선택 페이지로 이동
      navigate(`/reservation/${busId}/select-seat?date=${selectedDate}&time=${selectedTime}`);
    } else {
      alert('예약 날짜를 선택해주세요.');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-mint">예약 날짜 선택</h1>
      <div className="flex justify-center mb-4">
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-64 p-2 border rounded-lg"
        >
          <option value="">날짜 선택</option>
          {getDateOptions().map((date) => (
            <option key={date} value={date}>
              {date}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-center">
        <button
          onClick={handleDateSelect}
          className="bg-mint hover:bg-mint-dark text-white py-2 px-6 rounded-lg font-semibold transition duration-300"
        >
          다음
        </button>
      </div>
    </div>
  );
}

export default SelectDate;
