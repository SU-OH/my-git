// src/components/UserAccounts.js
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

function UserAccounts() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const userList = usersSnapshot.docs.map((userDoc) => ({
          id: userDoc.id,
          ...userDoc.data(),
        }));
        setUsers(userList);
      } catch (error) {
        console.error('사용자 목록 가져오기 오류:', error);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId) => {
    const confirmDelete = window.confirm('이 사용자를 삭제하시겠습니까? 모든 예약 내역도 함께 삭제됩니다.');
    if (!confirmDelete) return;

    try {
      // Firestore에서 사용자 정보 삭제
      await deleteDoc(doc(db, 'users', userId));
      
      // 해당 사용자의 모든 예약 삭제
      const reservationsRef = collection(db, 'reservations');
      const userReservationsQuery = query(reservationsRef, where('userId', '==', userId));
      const reservationSnapshot = await getDocs(userReservationsQuery);

      const deleteReservations = reservationSnapshot.docs.map((reservationDoc) => deleteDoc(reservationDoc.ref));
      await Promise.all(deleteReservations);

      // 사용자 목록에서 삭제한 사용자 제거
      setUsers(users.filter((user) => user.id !== userId));
      alert('사용자 계정과 예약 내역이 삭제되었습니다.');
    } catch (error) {
      console.error('계정 삭제 오류:', error);
      alert('계정을 삭제하는 데 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-mint">사용자 계정 목록</h1>
      {users.length === 0 ? (
        <p className="text-center text-gray-700">등록된 사용자가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {users.map((user) => (
            <li key={user.id} className="bg-white p-4 rounded-lg shadow-lg flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold">이름: {user.name}</p>
                <p>이메일: {user.email}</p>
              </div>
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="bg-red-500 hover:bg-red-600 text-white py-1 px-4 rounded-lg font-semibold"
              >
                계정 삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UserAccounts;
