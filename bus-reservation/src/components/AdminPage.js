// src/components/AdminPage.js
import React from 'react';
import { Link } from 'react-router-dom';

function AdminPage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold mb-10 text-center text-mint">관리자 페이지</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/admin/add-bus"
          className="p-6 bg-white shadow-lg rounded-lg transform hover:scale-105 transition-transform duration-200"
        >
          <h2 className="text-2xl font-semibold text-center text-mint mb-2">버스 추가</h2>
          <p className="text-center text-gray-600">새로운 버스를 추가하고 스케줄을 관리합니다.</p>
        </Link>

        <Link
          to="/admin/view-reservations"
          className="p-6 bg-white shadow-lg rounded-lg transform hover:scale-105 transition-transform duration-200"
        >
          <h2 className="text-2xl font-semibold text-center text-mint mb-2">사용자 예약 목록</h2>
          <p className="text-center text-gray-600">모든 사용자 예약 내역을 조회합니다.</p>
        </Link>

        <Link
          to="/admin/user-accounts"
          className="p-6 bg-white shadow-lg rounded-lg transform hover:scale-105 transition-transform duration-200"
        >
          <h2 className="text-2xl font-semibold text-center text-mint mb-2">사용자 계정 목록</h2>
          <p className="text-center text-gray-600">사용자 계정 관리 및 삭제 기능을 제공합니다.</p>
        </Link>

        <Link
          to="/admin/manage-buses"
          className="p-6 bg-white shadow-lg rounded-lg transform hover:scale-105 transition-transform duration-200"
        >
          <h2 className="text-2xl font-semibold text-center text-mint mb-2">버스 노선 관리</h2>
          <p className="text-center text-gray-600">기존 버스 노선 정보를 수정 및 업데이트합니다.</p>
        </Link>
      </div>
    </div>
  );
}

export default AdminPage;
